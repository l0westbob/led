import type {
  PpfdBoard,
  PpfdEmitter,
  SourceBins,
  SourceCache,
} from "@/domain/ppfd/ppfdEstimatorTypes";

type SourceBinningWorkspace = {
  sourceBucketMap: Map<number, number>;
  sourceSumX: Float64Array;
  sourceSumY: Float64Array;
  sourceWeight: Uint32Array;
  sourceCache: SourceCache | null;
};

const MAX_SOURCE_BUCKETS_PER_BOARD = 128;
const SOURCE_BIN_EMITTER_THRESHOLD = 48;
const KEY_OFFSET = 1048576;
const KEY_STRIDE = 2097152;

const EMPTY_SOURCE_BINS: SourceBins = {
  xCell: new Float32Array(0),
  yCell: new Float32Array(0),
  weight: new Uint32Array(0),
  count: 0,
  sourceBinCells: 1,
};

export function createSourceBinningWorkspace(): SourceBinningWorkspace {
  return {
    sourceBucketMap: new Map(),
    sourceSumX: new Float64Array(0),
    sourceSumY: new Float64Array(0),
    sourceWeight: new Uint32Array(0),
    sourceCache: null,
  };
}

export function clearSourceBinningCache(
  workspace: SourceBinningWorkspace,
): void {
  workspace.sourceCache = null;
}

export function buildPreviewSourceBins(input: {
  board: Pick<PpfdBoard, "widthMm" | "depthMm">;
  emitters: PpfdEmitter[];
  cellMm: number;
  workspace: SourceBinningWorkspace;
}): SourceBins {
  const { board, cellMm, emitters, workspace } = input;
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
    workspace.sourceCache &&
    workspace.sourceCache.emitters === emitters &&
    workspace.sourceCache.key === cacheKey
  ) {
    return workspace.sourceCache.result;
  }

  if (workspace.sourceSumX.length < emitterCount) {
    workspace.sourceSumX = new Float64Array(emitterCount);
    workspace.sourceSumY = new Float64Array(emitterCount);
    workspace.sourceWeight = new Uint32Array(emitterCount);
  }

  const bucketMap = workspace.sourceBucketMap;
  const sumX = workspace.sourceSumX;
  const sumY = workspace.sourceSumY;
  const sourceWeight = workspace.sourceWeight;

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

  workspace.sourceCache = {
    emitters,
    key: cacheKey,
    result,
  };

  return result;
}
