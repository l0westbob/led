import { estimateBoardPpfUmolS } from "@/domain/ledV2Model";

const FLOAT_STAMP_CACHE = new Map();
const QUANTIZED_STAMP_CACHE = new Map();

const MAX_FLOAT_STAMP_CACHE_ENTRIES = 24;
const MAX_QUANTIZED_STAMP_CACHE_ENTRIES = 64;

// Empirically tuned scale factor that converts raw inverse-square sums into
// approximate PPFD (µmol m⁻² s⁻¹) units. Revisit if absolute calibration changes.
const PPFD_SCALE = 185000;

// Output precision: 1 internal unit = 0.01 PPFD.
// `values` is converted back to normal PPFD floats for heatmap compatibility.
const VALUE_SCALE = 100;
const INV_VALUE_SCALE = 1 / VALUE_SCALE;

// Main speed/quality knob.
// Lower = faster and less precise. Higher = slower and more precise.
const MAX_SOURCE_BUCKETS_PER_BOARD = 128;
const SOURCE_BIN_EMITTER_THRESHOLD = 48;

// Numeric 2D Map key constants for source bucketing.
// Large enough for normal room/board preview grids without collisions.
const KEY_OFFSET = 1048576;
const KEY_STRIDE = 2097152;

const EMPTY_SOURCE_BINS = {
  xCell: new Float32Array(0),
  yCell: new Float32Array(0),
  weight: new Uint32Array(0),
  count: 0,
  sourceBinCells: 1,
};

function evictOldest(cache, maxEntries) {
  if (cache.size >= maxEntries) {
    cache.delete(cache.keys().next().value);
  }
}

function addQuantizedStampToGrid(
  valuesUnits,
  gridWidth,
  gridDepth,
  stampEntry,
  centerX,
  centerY,
) {
  const stamp = stampEntry.stamp;
  const size = stampEntry.size;
  const radiusCells = stampEntry.radiusCells;
  const rowMin = stampEntry.rowMin;
  const rowMax = stampEntry.rowMax;

  let syMin = -radiusCells;
  if (centerY + syMin < 0) syMin = -centerY;

  let syMax = radiusCells;
  const maxSyFromGrid = gridDepth - 1 - centerY;
  if (syMax > maxSyFromGrid) syMax = maxSyFromGrid;

  if (syMin > syMax) return;

  let sxClipMin = -radiusCells;
  if (centerX + sxClipMin < 0) sxClipMin = -centerX;

  let sxClipMax = radiusCells;
  const maxSxFromGrid = gridWidth - 1 - centerX;
  if (sxClipMax > maxSxFromGrid) sxClipMax = maxSxFromGrid;

  if (sxClipMin > sxClipMax) return;

  for (let sy = syMin; sy <= syMax; sy += 1) {
    const stampRow = sy + radiusCells;
    const rowStartIndex = rowMin[stampRow];

    if (rowStartIndex < 0) continue;

    let sxMin = rowStartIndex - radiusCells;
    if (sxMin < sxClipMin) sxMin = sxClipMin;

    let sxMax = rowMax[stampRow] - radiusCells;
    if (sxMax > sxClipMax) sxMax = sxClipMax;

    if (sxMin > sxMax) continue;

    let gridIndex = (centerY + sy) * gridWidth + centerX + sxMin;
    let stampIndex = stampRow * size + radiusCells + sxMin;
    const gridEnd = gridIndex + sxMax - sxMin + 1;

    for (; gridIndex < gridEnd; gridIndex += 1, stampIndex += 1) {
      valuesUnits[gridIndex] += stamp[stampIndex];
    }
  }
}

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
  /**
   * @param {import("@/domain/BoardProfile").BoardProfile} board
   * @param {Array<{xMm: number, yMm: number, type: string}>} emitters
   * @param {number} resolutionCm
   * @param {{ boardPhotonFlux?: number, inputPowerW?: number }} [options]
   */
  constructor(board, emitters, resolutionCm, options = {}) {
    this.board = board;
    this.emitters = emitters;
    this.resolutionCm = resolutionCm;
    this.options = options;

    this._sourceBucketMap = new Map();
    this._sourceSumX = new Float64Array(0);
    this._sourceSumY = new Float64Array(0);
    this._sourceWeight = new Uint32Array(0);
    this._sourceCache = null;

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
    this._sourceCache = null;
    this._weightedStampLookup.clear();
    this._stampCacheKey = null;
  }

  /**
   * Shared fixture layout helper. If the board provides an explicit fixture
   * grid, we use it. Otherwise we fall back to an auto square-ish grid.
   *
   * @param {number} safeCount
   * @returns {{ columns: number, rows: number }}
   */
  _fixtureGrid(safeCount) {
    const explicitColumns = Math.max(
      0,
      Math.floor(this.board.fixtureColumns || 0),
    );
    const explicitRows = Math.max(0, Math.floor(this.board.fixtureRows || 0));
    if (explicitColumns > 0 && explicitRows > 0) {
      return { columns: explicitColumns, rows: explicitRows };
    }
    const columns = Math.ceil(Math.sqrt(safeCount));
    const rows = Math.ceil(safeCount / columns);
    return { columns, rows };
  }

  /**
   * @param {number} boardCount
   * @returns {Array<{xMm: number, yMm: number}>}
   */
  buildFixtureOffsets(boardCount) {
    const safeCount = Math.max(1, Math.floor(boardCount));
    const { columns, rows } = this._fixtureGrid(safeCount);
    const spacingXMm =
      (this.board.fixtureSpacingXCm ?? this.board.boardSpacingCm) * 10;
    const spacingYMm =
      (this.board.fixtureSpacingYCm ?? this.board.boardSpacingCm) * 10;
    const startX = -((columns - 1) * spacingXMm) / 2;
    const startY = -((rows - 1) * spacingYMm) / 2;
    const offsets = [];

    for (let index = 0; index < safeCount; index += 1) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      offsets.push({
        xMm: startX + column * spacingXMm,
        yMm: startY + row * spacingYMm,
      });
    }

    return offsets;
  }

  /**
   * Kept for API compatibility.
   * The fast estimate path uses buildQuantizedStamp() instead.
   *
   * @param {number} radiusCells
   * @param {number} cellMm
   * @param {number} distanceMm
   * @returns {{ stamp: Float32Array, size: number }}
   */
  buildStamp(radiusCells, cellMm, distanceMm) {
    const cacheKey = `${radiusCells}:${cellMm}:${distanceMm}`;
    const cached = FLOAT_STAMP_CACHE.get(cacheKey);
    if (cached) return cached;

    const size = radiusCells * 2 + 1;
    const stamp = new Float32Array(size * size);
    const distanceSq = distanceMm * distanceMm;

    for (let sy = -radiusCells; sy <= radiusCells; sy += 1) {
      const dy = sy * cellMm;
      const rowOffset = (sy + radiusCells) * size;

      for (let sx = -radiusCells; sx <= radiusCells; sx += 1) {
        const dx = sx * cellMm;
        stamp[rowOffset + sx + radiusCells] =
          1 / (dx * dx + dy * dy + distanceSq);
      }
    }

    const result = { stamp, size };
    evictOldest(FLOAT_STAMP_CACHE, MAX_FLOAT_STAMP_CACHE_ENTRIES);
    FLOAT_STAMP_CACHE.set(cacheKey, result);

    return result;
  }

  /**
   * Builds a stamp already scaled and rounded to integer centi-PPFD.
   * Source weight is baked into the stamp, so the inner loop is add-only.
   *
   * @param {number} maxRadiusCells
   * @param {number} cellMm
   * @param {number} distanceMm
   * @param {number} emitterScale
   * @param {number} weight
   * @returns {{
   *   stamp: Uint16Array | Uint32Array,
   *   size: number,
   *   radiusCells: number,
   *   rowMin: Int32Array,
   *   rowMax: Int32Array
   * } | null}
   */
  buildQuantizedStamp(
    maxRadiusCells,
    cellMm,
    distanceMm,
    emitterScale,
    weight,
  ) {
    const scaleUnits = Math.max(
      0,
      Math.round(emitterScale * weight * VALUE_SCALE),
    );

    if (scaleUnits === 0) return null;

    const distanceSq = distanceMm * distanceMm;

    // A rounded centi-PPFD contribution is nonzero only when:
    // scaleUnits / distanceSquared >= 0.5
    const nonZeroDistanceSq = scaleUnits * 2 - distanceSq;
    if (nonZeroDistanceSq < 0) return null;

    let radiusCells = maxRadiusCells;
    const precisionRadiusCells = Math.ceil(
      Math.sqrt(nonZeroDistanceSq) / cellMm,
    );

    if (precisionRadiusCells < radiusCells) {
      radiusCells = precisionRadiusCells;
    }

    const cacheKey = `${radiusCells}:${cellMm}:${distanceMm}:${scaleUnits}`;
    const cached = QUANTIZED_STAMP_CACHE.get(cacheKey);
    if (cached) return cached;

    const size = radiusCells * 2 + 1;
    const centerUnits = Math.round(scaleUnits / distanceSq);
    const StampArray = centerUnits <= 0xffff ? Uint16Array : Uint32Array;

    const stamp = new StampArray(size * size);
    const rowMin = new Int32Array(size);
    const rowMax = new Int32Array(size);

    // Precompute dx^2 for the whole row so the inner loop avoids dx*dx.
    const dxSq = new Float64Array(size);
    for (let sx = -radiusCells; sx <= radiusCells; sx += 1) {
      const dx = sx * cellMm;
      dxSq[sx + radiusCells] = dx * dx;
    }

    for (let sy = -radiusCells; sy <= radiusCells; sy += 1) {
      const dy = sy * cellMm;
      const dySq = dy * dy;
      const row = sy + radiusCells;
      const rowOffset = row * size;
      let first = -1;
      let last = -1;

      for (let sx = -radiusCells; sx <= radiusCells; sx += 1) {
        const units = Math.round(
          scaleUnits / (dxSq[sx + radiusCells] + dySq + distanceSq),
        );

        if (units > 0) {
          const index = rowOffset + sx + radiusCells;
          stamp[index] = units > 0xffffffff ? 0xffffffff : units;

          if (first < 0) first = sx + radiusCells;
          last = sx + radiusCells;
        }
      }

      rowMin[row] = first;
      rowMax[row] = last;
    }

    const result = { stamp, size, radiusCells, rowMin, rowMax };
    evictOldest(QUANTIZED_STAMP_CACHE, MAX_QUANTIZED_STAMP_CACHE_ENTRIES);
    QUANTIZED_STAMP_CACHE.set(cacheKey, result);

    return result;
  }

  /**
   * Groups physical emitters into a smaller set of virtual preview sources.
   * This is the main approximation that saves time.
   *
   * @param {number} cellMm
   * @returns {{
   *   xCell: Float32Array,
   *   yCell: Float32Array,
   *   weight: Uint32Array,
   *   count: number,
   *   sourceBinCells: number
   * }}
   */
  buildPreviewSourceBins(cellMm) {
    const board = this.board;
    const emitters = this.emitters;
    const emitterCount = emitters.length;

    if (emitterCount === 0) return EMPTY_SOURCE_BINS;

    const boardCellsX = Math.max(1, Math.ceil(board.widthMm / cellMm));
    const boardCellsY = Math.max(1, Math.ceil(board.depthMm / cellMm));
    const boardCellEstimate = boardCellsX * boardCellsY;

    const sourceBinCells =
      emitterCount >= SOURCE_BIN_EMITTER_THRESHOLD
        ? Math.max(
            1,
            Math.ceil(
              Math.sqrt(boardCellEstimate / MAX_SOURCE_BUCKETS_PER_BOARD),
            ),
          )
        : 1;

    const cacheKey = `${cellMm}:${board.widthMm}:${board.depthMm}:${sourceBinCells}:${emitterCount}`;

    if (
      this._sourceCache &&
      this._sourceCache.emitters === emitters &&
      this._sourceCache.key === cacheKey
    ) {
      return this._sourceCache.result;
    }

    if (this._sourceSumX.length < emitterCount) {
      this._sourceSumX = new Float64Array(emitterCount);
      this._sourceSumY = new Float64Array(emitterCount);
      this._sourceWeight = new Uint32Array(emitterCount);
    }

    const bucketMap = this._sourceBucketMap;
    const sumX = this._sourceSumX;
    const sumY = this._sourceSumY;
    const sourceWeight = this._sourceWeight;

    bucketMap.clear();

    const invCellMm = 1 / cellMm;
    const boardHalfWidthCell = board.widthMm * 0.5 * invCellMm;
    const boardHalfDepthCell = board.depthMm * 0.5 * invCellMm;

    let bucketCount = 0;

    for (let emitterIndex = 0; emitterIndex < emitterCount; emitterIndex += 1) {
      const emitter = emitters[emitterIndex];

      const relXCell = emitter.xMm * invCellMm - boardHalfWidthCell;
      const relYCell = emitter.yMm * invCellMm - boardHalfDepthCell;

      const binX = Math.floor(relXCell / sourceBinCells);
      const binY = Math.floor(relYCell / sourceBinCells);
      const key = (binX + KEY_OFFSET) * KEY_STRIDE + binY + KEY_OFFSET;

      let bucketIndex = bucketMap.get(key);

      if (bucketIndex === undefined) {
        bucketIndex = bucketCount;
        bucketMap.set(key, bucketIndex);

        sumX[bucketIndex] = relXCell;
        sumY[bucketIndex] = relYCell;
        sourceWeight[bucketIndex] = 1;

        bucketCount += 1;
      } else {
        sumX[bucketIndex] += relXCell;
        sumY[bucketIndex] += relYCell;
        sourceWeight[bucketIndex] += 1;
      }
    }

    const xCell = new Float32Array(bucketCount);
    const yCell = new Float32Array(bucketCount);
    const weight = new Uint32Array(bucketCount);

    for (let index = 0; index < bucketCount; index += 1) {
      const count = sourceWeight[index];

      xCell[index] = sumX[index] / count;
      yCell[index] = sumY[index] / count;
      weight[index] = count;
    }

    const result = {
      xCell,
      yCell,
      weight,
      count: bucketCount,
      sourceBinCells,
    };

    this._sourceCache = {
      emitters,
      key: cacheKey,
      result,
    };

    return result;
  }

  /**
   * @returns {{
   *   values: Float32Array,
   *   valuesUnits: Uint32Array,
   *   valueScale: number,
   *   averageUnits: number,
   *   minUnits: number,
   *   maxUnits: number,
   *   gridWidth: number,
   *   gridDepth: number,
   *   average: number,
   *   min: number,
   *   max: number,
   *   inputPower: number,
   *   boardPhotonFlux: number,
   *   fixtureCount: number,
   *   cellCount: number,
   *   sourceCount: number,
   *   sourceBinCells: number
   * }}
   */
  estimate() {
    const board = this.board;
    const emitters = this.emitters;
    const emitterCount = emitters.length;
    const resolutionCm = this.resolutionCm;

    const inputPower = Number.isFinite(this.options.inputPowerW)
      ? this.options.inputPowerW
      : board.voltageV * board.currentA;

    // New architecture path can inject a resolved board photon flux so the
    // estimator stays geometry-focused. Old callers still use the legacy LED
    // model fallback for backward compatibility.
    let boardPhotonFlux = Number(this.options.boardPhotonFlux);
    if (!Number.isFinite(boardPhotonFlux)) {
      const currentMA =
        inputPower > 0 && emitterCount > 0
          ? (board.currentA * 1000) / emitterCount
          : 0;
      const v2 = estimateBoardPpfUmolS(board.ledType, {
        inputPowerW: inputPower,
        currentMA,
        solderPointTempC: board.temperatureC,
      });
      boardPhotonFlux = Math.max(0, v2.ppfUmolS);
    } else {
      boardPhotonFlux = Math.max(0, boardPhotonFlux);
    }

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
    const sourceXCell = sources.xCell;
    const sourceYCell = sources.yCell;
    const sourceWeight = sources.weight;

    const emitterScale =
      sourceCount === 0
        ? 0
        : (boardPhotonFlux / Math.max(1, emitterCount)) * PPFD_SCALE;

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

    const boardCenterXCell = roomWidthMm * 0.5 * invCellMm;
    const boardCenterYCell = roomDepthMm * 0.5 * invCellMm;

    /** @type {Array<{xMm:number,yMm:number}>} */
    const explicitOffsets = Array.isArray(this.options.fixtureOffsetsMm)
      ? this.options.fixtureOffsetsMm
      : [];
    let fixtureOffsetsCell = explicitOffsets.map((offset) => ({
      x: boardCenterXCell + (Number(offset.xMm) || 0) * invCellMm,
      y: boardCenterYCell + (Number(offset.yMm) || 0) * invCellMm,
    }));

    if (fixtureOffsetsCell.length === 0) {
      // Fixture layout via shared helper, keeping this in sync with buildFixtureOffsets.
      const safeCount = Math.max(1, Math.floor(board.boardCount));
      const { columns, rows } = this._fixtureGrid(safeCount);
      const spacingXCell =
        (board.fixtureSpacingXCm ?? board.boardSpacingCm) / resolutionCm;
      const spacingYCell =
        (board.fixtureSpacingYCm ?? board.boardSpacingCm) / resolutionCm;
      const startXCell = -((columns - 1) * spacingXCell) * 0.5;
      const startYCell = -((rows - 1) * spacingYCell) * 0.5;
      let fixtureIndex = 0;
      fixtureOffsetsCell = [];
      for (
        let fixtureRow = 0;
        fixtureRow < rows && fixtureIndex < safeCount;
        fixtureRow += 1
      ) {
        for (
          let fixtureColumn = 0;
          fixtureColumn < columns && fixtureIndex < safeCount;
          fixtureColumn += 1, fixtureIndex += 1
        ) {
          fixtureOffsetsCell.push({
            x: boardCenterXCell + startXCell + fixtureColumn * spacingXCell,
            y: boardCenterYCell + startYCell + fixtureRow * spacingYCell,
          });
        }
      }
    }

    for (const fixtureOffset of fixtureOffsetsCell) {
      const fixtureCellX = fixtureOffset.x;
      const fixtureCellY = fixtureOffset.y;
        for (let sourceIndex = 0; sourceIndex < sourceCount; sourceIndex += 1) {
          const stampEntry = sourceStamps[sourceIndex];
          if (stampEntry === null) continue;

          // Math.floor() is used instead of `| 0` to correctly handle negative
          // fractional coordinates (truncation toward zero != floor for negatives).
          const centerX = Math.floor(fixtureCellX + sourceXCell[sourceIndex]);
          const centerY = Math.floor(fixtureCellY + sourceYCell[sourceIndex]);

          const radiusCells = stampEntry.radiusCells;

          if (
            centerX + radiusCells < 0 ||
            centerX - radiusCells >= gridWidth ||
            centerY + radiusCells < 0 ||
            centerY - radiusCells >= gridDepth
          ) {
            continue;
          }

          addQuantizedStampToGrid(
            valuesUnits,
            gridWidth,
            gridDepth,
            stampEntry,
            centerX,
            centerY,
          );
        }
    }

    // Compatibility array for the existing heatmap (normal PPFD floats).
    if (this._values.length < cellCount) {
      this._values = new Float32Array(cellCount);
    }
    const values = this._values;

    // JS numbers are float64; naming the intent explicitly.
    // Uint32 values up to ~4B per cell × up to ~250K cells fits well within
    // float64's 2^53 exact-integer range, so no precision loss occurs here.
    let totalUnits = 0;

    // Guard against empty grids: initialise min only when there is data.
    let minUnits = cellCount > 0 ? 0xffffffff : 0;
    let maxUnits = 0;

    for (let index = 0; index < cellCount; index += 1) {
      const units = valuesUnits[index];

      totalUnits += units;

      if (units < minUnits) minUnits = units;
      if (units > maxUnits) maxUnits = units;

      values[index] = units * INV_VALUE_SCALE;
    }

    const averageUnits = cellCount > 0 ? Math.round(totalUnits / cellCount) : 0;

    return {
      // Old API: normal PPFD values. Use this with the current heatmap.
      values,

      // Fast API: integer centi-PPFD values. Use this later for faster rendering.
      valuesUnits,
      valueScale: VALUE_SCALE,

      averageUnits,
      minUnits,
      maxUnits,

      gridWidth,
      gridDepth,

      average: averageUnits * INV_VALUE_SCALE,
      min: minUnits * INV_VALUE_SCALE,
      max: maxUnits * INV_VALUE_SCALE,

      inputPower,
      boardPhotonFlux,
      fixtureCount: fixtureOffsetsCell.length,
      cellCount,

      sourceCount,
      sourceBinCells: sources.sourceBinCells,
    };
  }
}
