import { resolveLedDefinition } from "@/catalog/ledCatalog";
import { resolveSpectralDataset } from "@/catalog/spectralCatalog";

/**
 * @typedef {import("@/domain/contracts").AppIssue} AppIssue
 */

/**
 * Resolve LED, spectrum id, and calibration anchor with deterministic warnings.
 *
 * @param {{ ledId:string, stepNm?:1|5 }} input
 * @returns {{
 *   data: {
 *     led: import("@/domain/contracts").LedDefinition|null,
 *     spectrum: import("@/domain/contracts").SpectralSeries|null
 *   },
 *   led: import("@/domain/contracts").LedDefinition|null,
 *   spectrum: import("@/domain/contracts").SpectralSeries|null,
 *   warnings: AppIssue[],
 *   errors: AppIssue[]
 * }}
 */
export function resolveLedContext(input) {
  const warnings = [];
  const errors = [];
  const led = resolveLedDefinition(input.ledId);
  if (!led) {
    errors.push({
      code: "LED_NOT_FOUND",
      message: `Unknown LED id: ${input.ledId}`,
      severity: "error",
      field: "ledType",
    });
    return {
      data: { led: null, spectrum: null },
      led: null,
      spectrum: null,
      warnings,
      errors,
    };
  }

  const hasPpfAnchor = Number.isFinite(led?.spectrumCalibration?.ppfUmolS);
  const hasLumenAnchor = Number.isFinite(led?.spectrumCalibration?.luminousFluxLm);
  if (!hasPpfAnchor && !hasLumenAnchor) {
    warnings.push({
      code: "MISSING_CALIBRATION_ANCHOR",
      message: `${led.id} has no ppf/lumen calibration anchor.`,
      severity: "warning",
      field: "ledType",
    });
  }

  if (!led.spectralSeriesId) {
    warnings.push({
      code: "MISSING_SPECTRAL_SERIES_ID",
      message: `${led.id} has no mapped spectral series id.`,
      severity: "warning",
      field: "ledType",
    });
    return {
      data: { led, spectrum: null },
      led,
      spectrum: null,
      warnings,
      errors,
    };
  }

  let spectrum = null;
  try {
    spectrum = resolveSpectralDataset(led.spectralSeriesId, { stepNm: input.stepNm ?? 5 });
  } catch {
    warnings.push({
      code: "SPECTRAL_DATASET_NOT_FOUND",
      message: `Spectral dataset missing for ${led.id} (${led.spectralSeriesId}).`,
      severity: "warning",
      field: "ledType",
    });
  }

  return {
    data: { led, spectrum },
    led,
    spectrum,
    warnings,
    errors,
  };
}
