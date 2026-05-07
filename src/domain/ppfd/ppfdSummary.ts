export type PpfdValueSummary = {
  averageUnits: number;
  minUnits: number;
  maxUnits: number;
  average: number;
  min: number;
  max: number;
};

export function copyUnitsToValuesAndSummarize(input: {
  valuesUnits: Uint32Array;
  values: Float32Array;
  cellCount: number;
  invValueScale: number;
}): PpfdValueSummary {
  const { valuesUnits, values, cellCount, invValueScale } = input;
  let totalUnits = 0;
  let minUnits = cellCount > 0 ? 0xffffffff : 0;
  let maxUnits = 0;

  for (let index = 0; index < cellCount; index += 1) {
    const units = valuesUnits[index];

    totalUnits += units;

    if (units < minUnits) minUnits = units;
    if (units > maxUnits) maxUnits = units;

    values[index] = units * invValueScale;
  }

  const averageUnits = cellCount > 0 ? Math.round(totalUnits / cellCount) : 0;

  return {
    averageUnits,
    minUnits,
    maxUnits,
    average: averageUnits * invValueScale,
    min: minUnits * invValueScale,
    max: maxUnits * invValueScale,
  };
}
