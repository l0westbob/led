import {
  resolveFixtureGrid,
  resolveFixtureOffsetsMm,
} from "@/domain/ppfd/fixtureLayout";
import {
  accumulateQuantizedSources,
  resolveFixtureOffsetsCell,
} from "@/domain/ppfd/ppfdAccumulation";
import {
  buildPreviewSourceBins as buildPreviewSourceBinsWithWorkspace,
  clearSourceBinningCache,
  createSourceBinningWorkspace,
} from "@/domain/ppfd/ppfdSourceBinning";
import {
  buildFloatStamp,
  buildQuantizedStamp as buildQuantizedStampEntry,
  type FloatStampEntry,
  type QuantizedStampEntry,
} from "@/domain/ppfd/ppfdStampCache";
import { copyUnitsToValuesAndSummarize } from "@/domain/ppfd/ppfdSummary";
import type {
  EstimatorOptions,
  PpfdBoard,
  PpfdEmitter,
  PpfdGeometryEstimate,
} from "@/domain/ppfd/ppfdEstimatorTypes";

// Empirically tuned scale factor that converts raw inverse-square sums into
// approximate PPFD (µmol m⁻² s⁻¹) units. Revisit if absolute calibration changes.
const PPFD_SCALE = 185000;

// Output precision: 1 internal unit = 0.01 PPFD.
// `values` is converted back to normal PPFD floats for heatmap compatibility.
const VALUE_SCALE = 100;
const INV_VALUE_SCALE = 1 / VALUE_SCALE;

type SourceBinningWorkspace = ReturnType<typeof createSourceBinningWorkspace>;

/**
 * PPFD estimator optimized for very fast approximate interactive previews.
 *
 * Compatibility:
 * - `values` is still a Float32Array with normal PPFD values.
 * - `valuesUnits` is a Uint32Array where 1 unit = 0.01 PPFD.
 *
 * For maximum render speed later, the heatmap can use `valuesUnits`,
 * `minUnits`, and `maxUnits` directly, then divide by `valueScale`
 * only for labels/tooltips.
 */
export class PpfdEstimator {
  board: PpfdBoard;
  emitters: PpfdEmitter[];
  resolutionCm: number;
  options: EstimatorOptions;
  _sourceBinning: SourceBinningWorkspace;
  _weightedStampLookup: Map<number, QuantizedStampEntry | null>;
  _stampCacheKey: string | null;
  _sourceStamps: Array<QuantizedStampEntry | null>;
  _sourceStampsCapacity: number;
  _valuesUnits: Uint32Array;
  _values: Float32Array;

  constructor(
    board: PpfdBoard,
    emitters: PpfdEmitter[],
    resolutionCm: number,
    options: EstimatorOptions = {},
  ) {
    this.board = board;
    this.emitters = emitters;
    this.resolutionCm = resolutionCm;
    this.options = options;

    this._sourceBinning = createSourceBinningWorkspace();

    // Persisted across estimate() calls.
    // Only cleared when emitterScale, cellMm, or distanceMm actually change.
    // This avoids rebuilding quantized stamps on every interactive frame.
    this._weightedStampLookup = new Map();
    this._stampCacheKey = null;

    // Capacity-tracked to avoid GC churn on fluctuating source counts.
    this._sourceStamps = [];
    this._sourceStampsCapacity = 0;

    // Reused output buffers to avoid allocating big arrays every frame.
    this._valuesUnits = new Uint32Array(0);
    this._values = new Float32Array(0);
  }

  /**
   * Call this if you mutate the existing emitters array in place.
   * If you replace the emitters array entirely, the cache invalidates automatically.
   */
  clearPreviewCaches() {
    clearSourceBinningCache(this._sourceBinning);
    this._weightedStampLookup.clear();
    this._stampCacheKey = null;
  }

  /**
   * Shared fixture layout helper. If the board provides an explicit fixture
   * grid, we use it. Otherwise we fall back to an auto square-ish grid.
   */
  _fixtureGrid(safeCount: number) {
    return resolveFixtureGrid({
      fixtureCount: safeCount,
      fixtureColumns: this.board.fixtureColumns,
      fixtureRows: this.board.fixtureRows,
    });
  }

  buildFixtureOffsets(boardCount: number) {
    return resolveFixtureOffsetsMm({
      board: this.board,
      fixtureCount: boardCount,
    });
  }

  /**
   * Kept for API compatibility.
   * The fast estimate path uses buildQuantizedStamp() instead.
   */
  buildStamp(
    radiusCells: number,
    cellMm: number,
    distanceMm: number,
  ): FloatStampEntry {
    return buildFloatStamp({ radiusCells, cellMm, distanceMm });
  }

  /**
   * Builds a stamp already scaled and rounded to integer centi-PPFD.
   * Source weight is baked into the stamp, so the inner loop is add-only.
   */
  buildQuantizedStamp(
    maxRadiusCells: number,
    cellMm: number,
    distanceMm: number,
    emitterScale: number,
    weight: number,
  ): QuantizedStampEntry | null {
    return buildQuantizedStampEntry({
      maxRadiusCells,
      cellMm,
      distanceMm,
      emitterScale,
      weight,
      valueScale: VALUE_SCALE,
    });
  }

  /**
   * Groups physical emitters into a smaller set of virtual preview sources.
   * This is the main approximation that saves time.
   */
  buildPreviewSourceBins(cellMm: number) {
    return buildPreviewSourceBinsWithWorkspace({
      board: this.board,
      emitters: this.emitters,
      cellMm,
      workspace: this._sourceBinning,
    });
  }

  estimate(): PpfdGeometryEstimate {
    const board = this.board;
    const emitters = this.emitters;
    const emitterCount = emitters.length;
    const resolutionCm = this.resolutionCm;

    const inputPower =
      typeof this.options.inputPowerW === "number" &&
      Number.isFinite(this.options.inputPowerW)
        ? this.options.inputPowerW
        : board.voltageV * board.currentA;

    const boardPhotonFlux = Number(this.options.boardPhotonFlux);
    if (!Number.isFinite(boardPhotonFlux)) {
      throw new Error(
        "PpfdEstimator requires options.boardPhotonFlux; resolve photon output before calling the geometry engine.",
      );
    }
    const resolvedBoardPhotonFlux = Math.max(0, boardPhotonFlux);

    const gridWidth = Math.max(1, Math.floor(board.roomWidthCm / resolutionCm));
    const gridDepth = Math.max(1, Math.floor(board.roomDepthCm / resolutionCm));
    const cellCount = gridWidth * gridDepth;

    // Internal accumulation array. 1 unit = 0.01 PPFD.
    // Reuse buffers to reduce allocations/GC during interactive updates.
    if (this._valuesUnits.length < cellCount) {
      this._valuesUnits = new Uint32Array(cellCount);
    } else {
      this._valuesUnits.fill(0, 0, cellCount);
    }
    const valuesUnits = this._valuesUnits;

    const cellMm = resolutionCm * 10;
    const invCellMm = 1 / cellMm;

    const roomWidthMm = board.roomWidthCm * 10;
    const roomDepthMm = board.roomDepthCm * 10;
    const distanceMm = Math.max(10, board.distanceCm * 10);

    const sources = this.buildPreviewSourceBins(cellMm);
    const sourceCount = sources.count;
    const sourceWeight = sources.weight;

    const emitterScale =
      sourceCount === 0
        ? 0
        : (resolvedBoardPhotonFlux / Math.max(1, emitterCount)) * PPFD_SCALE;

    // Persist weighted stamp lookup across frames; only rebuild when the
    // parameters that determine stamp shape actually change. This is the
    // primary hot-path saving during interactive dragging/sliders.
    const stampCacheKey = `${emitterScale}:${cellMm}:${distanceMm}`;
    if (this._stampCacheKey !== stampCacheKey) {
      this._weightedStampLookup.clear();
      this._stampCacheKey = stampCacheKey;
    }

    const roomDiagMm = Math.hypot(roomWidthMm, roomDepthMm);
    const maxRadiusCells = Math.ceil((roomDiagMm * 0.5) / cellMm);

    const weightedStampLookup = this._weightedStampLookup;

    // Grow the stamps buffer only when necessary; never shrink to avoid GC churn.
    if (this._sourceStampsCapacity < sourceCount) {
      this._sourceStamps = new Array(sourceCount);
      this._sourceStampsCapacity = sourceCount;
    }

    const sourceStamps = this._sourceStamps;

    for (let sourceIndex = 0; sourceIndex < sourceCount; sourceIndex += 1) {
      const weight = sourceWeight[sourceIndex];
      let stampEntry = weightedStampLookup.get(weight);

      if (stampEntry === undefined) {
        stampEntry = this.buildQuantizedStamp(
          maxRadiusCells,
          cellMm,
          distanceMm,
          emitterScale,
          weight,
        );
        weightedStampLookup.set(weight, stampEntry ?? null);
      }

      sourceStamps[sourceIndex] = stampEntry;
    }

    const fixtureOffsetsCell = resolveFixtureOffsetsCell({
      board,
      invCellMm,
      roomWidthMm,
      roomDepthMm,
      explicitOffsetsMm: this.options.fixtureOffsetsMm,
    });

    accumulateQuantizedSources({
      valuesUnits,
      gridWidth,
      gridDepth,
      fixtureOffsetsCell,
      sources,
      sourceStamps,
    });

    // Compatibility array for the existing heatmap (normal PPFD floats).
    if (this._values.length < cellCount) {
      this._values = new Float32Array(cellCount);
    }
    const values = this._values;

    const valueSummary = copyUnitsToValuesAndSummarize({
      valuesUnits,
      values,
      cellCount,
      invValueScale: INV_VALUE_SCALE,
    });

    return {
      // Old API: normal PPFD values. Use this with the current heatmap.
      values,

      // Fast API: integer centi-PPFD values. Use this later for faster rendering.
      valuesUnits,
      valueScale: VALUE_SCALE,

      averageUnits: valueSummary.averageUnits,
      minUnits: valueSummary.minUnits,
      maxUnits: valueSummary.maxUnits,

      gridWidth,
      gridDepth,

      average: valueSummary.average,
      min: valueSummary.min,
      max: valueSummary.max,

      inputPower,
      boardPhotonFlux: resolvedBoardPhotonFlux,
      fixtureCount: fixtureOffsetsCell.length,
      cellCount,

      sourceCount,
      sourceBinCells: sources.sourceBinCells,
    };
  }
}
