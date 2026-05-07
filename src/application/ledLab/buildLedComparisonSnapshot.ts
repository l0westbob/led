import { buildLedLabSnapshot } from "@/application/ledLab/buildLedLabSnapshot";
import {
  formatLedDisplayName,
  resolveBestBinLabel,
} from "@/catalog/ledCatalog";
import {
  estimatePhotonFluxUmolS,
  formatSpectralMetric,
} from "@/application/ledLab/spectralComparisonMath";
import { buildSpectrumChartViewModel } from "@/application/ledLab/buildSpectrumChartViewModel";
import { createSnapshotEnvelope } from "@/contracts/versioned/results";

type ComparedLedRow = { id: string; color: string };

/**
 * Build full LED comparison VM for the LED Lab page/components.
 *
 * @param {{
 *   comparedLeds: Array<{id:string,color:string}>,
 *   mode: "relative" | "photon",
 *   fallbackLedId: string
 * }} input
 */
export function buildLedComparisonSnapshot(input: {
  comparedLeds: ComparedLedRow[];
  mode: "relative" | "photon";
  fallbackLedId: string;
}) {
  const mode = input.mode === "photon" ? "photon" : "relative";
  const activeRows = (
    Array.isArray(input.comparedLeds) ? input.comparedLeds : []
  ).filter((row) => row.id);

  const ledSnapshots = activeRows.map((row) => ({
    row,
    snapshot: buildLedLabSnapshot({
      selectedLedId: row.id,
      mode,
    }),
  }));

  const base =
    ledSnapshots[0]?.snapshot ??
    buildLedLabSnapshot({
      selectedLedId: input.fallbackLedId,
      mode,
    });

  const staticSeries =
    mode === "relative"
      ? base.chartData.series.filter((s) => s.id !== "led")
      : [];

  const ledSeries = ledSnapshots.flatMap(({ snapshot, row }, index) => {
    const series = snapshot.chartData.series.find((s) => s.id === "led");
    if (!series) return [];
    return [
      {
        ...series,
        id: `led-${index + 1}`,
        label: `${formatLedDisplayName(snapshot.led)} • ${resolveBestBinLabel(snapshot.led)}`,
        color: row.color,
      },
    ];
  });

  const allSeries = [...staticSeries, ...ledSeries];
  const chartViewModel = buildSpectrumChartViewModel({
    mode,
    nmMin: base.chartData.nmMin,
    nmMax: base.chartData.nmMax,
    series: allSeries,
  });

  const columns = ledSnapshots.map(({ snapshot, row }, index) => {
    const spectrum =
      snapshot.chartData.series.find((s) => s.id === "led")?.y ?? [];
    const photonFlux =
      mode === "photon" ? estimatePhotonFluxUmolS(spectrum) : null;
    return {
      key: `led-${index + 1}`,
      label: `LED ${index + 1}`,
      color: row.color,
      stats: snapshot.spectralStats,
      photonFlux,
    };
  });

  return {
    ...base,
    mode,
    chartData: {
      ...base.chartData,
      series: chartViewModel.series,
    },
    yAxisLabel: chartViewModel.yAxisLabel,
    yTicks: chartViewModel.yTicks,
    ledMaxY: chartViewModel.maxPhotonValue,
    columns,
    formatMetric: formatSpectralMetric,
    formatPhotonFlux(value: number | null) {
      return Number.isFinite(value) ? Number(value).toFixed(3) : "—";
    },
    seriesPath(seriesY: number[]) {
      return chartViewModel.seriesPath(seriesY);
    },
  };
}

/**
 * Contract-standardized LED comparison snapshot envelope.
 *
 * @param {{
 *   comparedLeds: Array<{id:string,color:string}>,
 *   mode: "relative" | "photon",
 *   fallbackLedId: string
 * }} input
 */
export function buildLedComparisonSnapshotEnvelope(input: {
  comparedLeds: ComparedLedRow[];
  mode: "relative" | "photon";
  fallbackLedId: string;
}) {
  const snapshot = buildLedComparisonSnapshot(input);
  return createSnapshotEnvelope({
    data: snapshot,
    warnings: snapshot.warnings,
    errors: snapshot.errors,
    timings: {},
  });
}
