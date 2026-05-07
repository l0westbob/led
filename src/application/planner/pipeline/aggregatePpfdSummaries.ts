import type { PpfdMapResult } from "@/domain/contracts";

export function mergePpfdSummaries(
  baseSummary: PpfdMapResult | null,
  nextSummary: PpfdMapResult,
): PpfdMapResult {
  if (!baseSummary) {
    return {
      ...nextSummary,
      valuesUnits: new Uint32Array(nextSummary.valuesUnits),
      values: new Float32Array(nextSummary.values),
    };
  }
  for (
    let valueIndex = 0;
    valueIndex < baseSummary.valuesUnits.length;
    valueIndex += 1
  ) {
    baseSummary.valuesUnits[valueIndex] += nextSummary.valuesUnits[valueIndex];
  }
  return baseSummary;
}

export function finalizeAggregateSummary(
  summary: PpfdMapResult,
): PpfdMapResult {
  let totalUnits = 0;
  let minUnits = summary.valuesUnits.length > 0 ? 0xffffffff : 0;
  let maxUnits = 0;
  for (
    let valueIndex = 0;
    valueIndex < summary.valuesUnits.length;
    valueIndex += 1
  ) {
    const units = summary.valuesUnits[valueIndex];
    totalUnits += units;
    if (units < minUnits) minUnits = units;
    if (units > maxUnits) maxUnits = units;
    summary.values[valueIndex] = units / summary.valueScale;
  }

  const averageUnits =
    summary.valuesUnits.length > 0
      ? Math.round(totalUnits / summary.valuesUnits.length)
      : 0;
  summary.minUnits = minUnits === 0xffffffff ? 0 : minUnits;
  summary.maxUnits = maxUnits;
  summary.averageUnits = averageUnits;
  summary.min = summary.minUnits / summary.valueScale;
  summary.max = summary.maxUnits / summary.valueScale;
  summary.average = summary.averageUnits / summary.valueScale;
  return summary;
}
