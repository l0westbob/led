export type FloatStampEntry = {
  stamp: Float32Array;
  size: number;
};

export type QuantizedStampEntry = {
  stamp: Uint16Array | Uint32Array;
  size: number;
  radiusCells: number;
  rowMin: Int32Array;
  rowMax: Int32Array;
};

const FLOAT_STAMP_CACHE = new Map<string, FloatStampEntry>();
const QUANTIZED_STAMP_CACHE = new Map<string, QuantizedStampEntry>();

const MAX_FLOAT_STAMP_CACHE_ENTRIES = 24;
const MAX_QUANTIZED_STAMP_CACHE_ENTRIES = 64;

function evictOldest<K, V>(cache: Map<K, V>, maxEntries: number) {
  if (cache.size >= maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
}

export function buildFloatStamp(input: {
  radiusCells: number;
  cellMm: number;
  distanceMm: number;
}): FloatStampEntry {
  const { radiusCells, cellMm, distanceMm } = input;
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

export function buildQuantizedStamp(input: {
  maxRadiusCells: number;
  cellMm: number;
  distanceMm: number;
  emitterScale: number;
  weight: number;
  valueScale: number;
}): QuantizedStampEntry | null {
  const { maxRadiusCells, cellMm, distanceMm, emitterScale, weight } = input;
  const scaleUnits = Math.max(
    0,
    Math.round(emitterScale * weight * input.valueScale),
  );

  if (scaleUnits === 0) return null;

  const distanceSq = distanceMm * distanceMm;

  // A rounded centi-PPFD contribution is nonzero only when:
  // scaleUnits / distanceSquared >= 0.5
  const nonZeroDistanceSq = scaleUnits * 2 - distanceSq;
  if (nonZeroDistanceSq < 0) return null;

  let radiusCells = maxRadiusCells;
  const precisionRadiusCells = Math.ceil(Math.sqrt(nonZeroDistanceSq) / cellMm);

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

export function addQuantizedStampToGrid(input: {
  valuesUnits: Uint32Array;
  gridWidth: number;
  gridDepth: number;
  stampEntry: QuantizedStampEntry;
  centerX: number;
  centerY: number;
}): void {
  const { valuesUnits, gridWidth, gridDepth, stampEntry, centerX, centerY } =
    input;
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
