import { formatLedDisplayName, listLedDefinitions } from "@/catalog/ledCatalog";
import {
  listSpectralDatasetIds,
  resolveSpectralDataset,
} from "@/catalog/spectralCatalog";
import {
  computeSpectralWeighting,
  expandActionCurveTo1nm,
  normalizeToMax,
} from "@/domain/spectral/math";
import { ACTION_DIN_5031, ACTION_MCCREE } from "@/domain/spectral/actionCurves";
import { resolveLedContext } from "@/application/shared/resolveLedContext";
import { resolveLedDisplaySpectrum } from "@/application/spectral/spectralCore";
import { createSnapshotEnvelope } from "@/contracts/versioned/results";
import type { AppIssue, SpectralSeries } from "@/domain/contracts";
import type { SpectrumChartSeries } from "@/application/ledLab/spectralComparisonMath";

const LED_LAB_SERIES_POLICY = {
  relative: {
    showMccree: true,
    showDin: true,
  },
  photon: {
    showMccree: false,
    showDin: false,
  },
};

function projectSpectrumToGrid(
  spectrum: {
    wavelengthNm: number[];
    intensityRel?: number[];
    values?: number[];
  } | null,
  nmMin: number,
  nmMax: number,
  valueKey: "intensityRel" | "values" = "intensityRel",
) {
  const lookup = new Map<number, number>();
  const sourceValues = spectrum?.[valueKey] ?? [];
  if (spectrum) {
    for (let i = 0; i < spectrum.wavelengthNm.length; i += 1) {
      lookup.set(
        Number(spectrum.wavelengthNm[i]),
        Number(sourceValues[i] ?? 0),
      );
    }
  }
  const wavelengthNm: number[] = [];
  const values: number[] = [];
  for (let nm = nmMin; nm <= nmMax; nm += 1) {
    wavelengthNm.push(nm);
    values.push(lookup.get(nm) ?? 0);
  }
  return { wavelengthNm, values };
}

/**
 * Shared LED Lab application snapshot.
 *
 * @param {{
 *   selectedLedId: string,
 *   spectralDatasetId?: string,
 *   mode?: "relative" | "photon"
 * }} input
 */
export function buildLedLabSnapshot(input: {
  selectedLedId: string;
  spectralDatasetId?: string;
  mode?: "relative" | "photon";
}) {
  const mode = input.mode === "photon" ? "photon" : "relative";
  const fallbackLedId = listLedDefinitions()[0]?.id ?? "";
  const ledContext =
    resolveLedContext({ ledId: input.selectedLedId, stepNm: 5 }) ??
    resolveLedContext({ ledId: fallbackLedId, stepNm: 5 });
  const led = ledContext.led ?? listLedDefinitions()[0] ?? null;
  const fallbackDatasetId =
    led?.spectralSeriesId ?? listSpectralDatasetIds()[0] ?? "";
  const selectedDatasetId = input.spectralDatasetId || fallbackDatasetId;
  const warnings: AppIssue[] = [...(ledContext.warnings ?? [])];
  const errors: AppIssue[] = [...(ledContext.errors ?? [])];

  let spectralDataset: SpectralSeries | null = null;
  let spectralDataset1nm: SpectralSeries | null = null;
  if (selectedDatasetId) {
    try {
      spectralDataset = resolveSpectralDataset(selectedDatasetId, {
        stepNm: 5,
      });
      spectralDataset1nm = resolveSpectralDataset(selectedDatasetId, {
        stepNm: 1,
      });
    } catch {
      warnings.push({
        code: "SPECTRAL_DATASET_RESOLUTION_FAILED",
        message: `Could not resolve spectral dataset '${selectedDatasetId}'.`,
        severity: "warning",
        field: "ledType",
      });
    }
  }

  const x = spectralDataset?.wavelengthNm ?? [];
  let s = spectralDataset?.intensityRel ?? [];
  if (mode === "photon") {
    s = s.map((vv, i) => (Number(vv ?? 0) || 0) * (Number(x[i] ?? 0) || 0));
  }
  const weighting = computeSpectralWeighting({ wavelengthNm: x, values: s });

  const nmMin = 280;
  const nmMax = 840;
  const mccreeLine = expandActionCurveTo1nm(ACTION_MCCREE, nmMin, nmMax);
  const dinLine = expandActionCurveTo1nm(ACTION_DIN_5031, nmMin, nmMax);
  const displaySpectrumResult = resolveLedDisplaySpectrum({
    ledId: led?.id ?? fallbackLedId,
    mode,
    stepNm: 1,
    nmMin,
    nmMax,
  });
  if (!displaySpectrumResult.ok) {
    warnings.push(...(displaySpectrumResult.warnings ?? []));
    errors.push(...(displaySpectrumResult.errors ?? []));
  }
  const displaySpectrum = displaySpectrumResult.ok
    ? displaySpectrumResult.data
    : null;
  const ledLine = projectSpectrumToGrid(
    displaySpectrum
      ? {
          wavelengthNm: displaySpectrum.wavelengthNm,
          intensityRel: displaySpectrum.values,
        }
      : null,
    nmMin,
    nmMax,
  );
  const ledLineValues =
    mode === "photon" ? ledLine.values : normalizeToMax(ledLine.values);

  const seriesPolicy = LED_LAB_SERIES_POLICY[mode];
  const chartSeries: SpectrumChartSeries[] = [];
  if (seriesPolicy.showMccree) {
    chartSeries.push({
      id: "mccree",
      label: "McCree",
      color: "rgba(160,255,90,0.95)",
      y: normalizeToMax(mccreeLine.values),
    });
  }
  if (seriesPolicy.showDin) {
    chartSeries.push({
      id: "din",
      label: "DIN 5031",
      color: "rgba(80,210,255,0.95)",
      y: normalizeToMax(dinLine.values),
    });
  }
  chartSeries.push({
    id: "led",
    label: selectedDatasetId || "Selected LED",
    color: "rgba(255,170,60,0.95)",
    y: ledLineValues,
  });

  return {
    led,
    ledOptions: listLedDefinitions(),
    spectralDataset,
    seriesOptions: listSpectralDatasetIds(),
    selectedDatasetId,
    mode,
    points1nm: spectralDataset1nm?.wavelengthNm.length ?? 0,
    points5nm: spectralDataset?.wavelengthNm.length ?? 0,
    spectralStats: {
      points: x.length,
      ...weighting,
      error: x.length === 0 ? "No spectrum selected." : null,
    },
    chartData: {
      nmMin,
      nmMax,
      series: chartSeries,
    },
    ledDisplayName: formatLedDisplayName(led),
    warnings,
    errors,
  };
}

/**
 * Contract-standardized LED Lab snapshot envelope.
 *
 * @param {{
 *   selectedLedId: string,
 *   spectralDatasetId?: string,
 *   mode?: "relative" | "photon"
 * }} input
 */
export function buildLedLabSnapshotEnvelope(input: {
  selectedLedId: string;
  spectralDatasetId?: string;
  mode?: "relative" | "photon";
}) {
  const snapshot = buildLedLabSnapshot(input);
  return createSnapshotEnvelope({
    data: snapshot,
    warnings: snapshot.warnings,
    errors: snapshot.errors,
    timings: {},
  });
}
