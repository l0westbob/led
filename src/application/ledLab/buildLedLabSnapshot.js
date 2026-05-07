import { formatLedDisplayName, listLedDefinitions } from "@/catalog/ledCatalog";
import { listSpectralDatasetIds, resolveSpectralDataset } from "@/catalog/spectralCatalog";
import {
  photonSpdFromPpf,
  photonSpdFromRadiant,
  radiantSpdFromLumens,
} from "@/domain/spectral/radiantCalibration";
import {
  computeSpectralWeighting,
  expandActionCurveTo1nm,
  normalizeToMax,
} from "@/domain/spectral/math";
import { ACTION_DIN_5031, ACTION_MCCREE } from "@/domain/spectral/actionCurves";
import { resolveLedContext } from "@/application/shared/resolveLedContext";

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

function projectSpectrumToGrid(spectrum, nmMin, nmMax, valueKey = "intensityRel") {
  const lookup = new Map();
  if (spectrum) {
    for (let i = 0; i < spectrum.wavelengthNm.length; i += 1) {
      lookup.set(Number(spectrum.wavelengthNm[i]), Number(spectrum[valueKey][i] ?? 0));
    }
  }
  const wavelengthNm = [];
  const values = [];
  for (let nm = nmMin; nm <= nmMax; nm += 1) {
    wavelengthNm.push(nm);
    values.push(lookup.get(nm) ?? 0);
  }
  return { wavelengthNm, values };
}

function buildDisplaySpectrum(led, spectralDataset, mode) {
  if (!spectralDataset) return null;
  if (mode !== "photon") {
    return {
      wavelengthNm: spectralDataset.wavelengthNm,
      values: spectralDataset.intensityRel,
    };
  }

  const cal = led?.spectrumCalibration;
  if (!cal) return null;
  if (Number.isFinite(cal.luminousFluxLm)) {
    const radiant = radiantSpdFromLumens(spectralDataset, cal.luminousFluxLm);
    const photon = photonSpdFromRadiant(radiant);
    return {
      wavelengthNm: photon.wavelengthNm,
      values: photon.intensityUmolSPerNm,
    };
  }
  if (Number.isFinite(cal.ppfUmolS)) {
    const photon = photonSpdFromPpf(spectralDataset, cal.ppfUmolS);
    return {
      wavelengthNm: photon.wavelengthNm,
      values: photon.intensityUmolSPerNm,
    };
  }
  return null;
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
export function buildLedLabSnapshot(input) {
  const mode = input.mode === "photon" ? "photon" : "relative";
  const fallbackLedId = listLedDefinitions()[0]?.id ?? "";
  const ledContext =
    resolveLedContext({ ledId: input.selectedLedId, stepNm: 5 }) ??
    resolveLedContext({ ledId: fallbackLedId, stepNm: 5 });
  const led = ledContext.led ?? listLedDefinitions()[0] ?? null;
  const fallbackDatasetId = led?.spectralSeriesId ?? listSpectralDatasetIds()[0] ?? "";
  const selectedDatasetId = input.spectralDatasetId || fallbackDatasetId;
  const warnings = [...(ledContext.warnings ?? [])];
  const errors = [...(ledContext.errors ?? [])];

  let spectralDataset = null;
  let spectralDataset1nm = null;
  if (selectedDatasetId) {
    try {
      spectralDataset = resolveSpectralDataset(selectedDatasetId, { stepNm: 5 });
      spectralDataset1nm = resolveSpectralDataset(selectedDatasetId, { stepNm: 1 });
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
  const displaySpectrum = buildDisplaySpectrum(led, spectralDataset1nm, mode);
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
  const chartSeries = [];
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
