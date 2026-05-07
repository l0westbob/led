import { integrateTrapezoid } from "@/domain/spectral/math";

const SPECTRUM_CHART_WIDTH = 900;
const SPECTRUM_CHART_HEIGHT = 260;
const SPECTRUM_CHART_PADDING = 40;

/**
 * Estimate the integrated photon flux from one photon SPD series.
 *
 * @param {number[]} photonSeriesValues
 * @returns {number|null}
 */
export function estimatePhotonFluxUmolS(photonSeriesValues) {
  if (!Array.isArray(photonSeriesValues) || photonSeriesValues.length < 2) {
    return null;
  }
  const wavelengthGrid = photonSeriesValues.map((_, index) => index);
  return integrateTrapezoid(wavelengthGrid, photonSeriesValues);
}

/**
 * Format one spectral metric value for table rendering.
 *
 * @param {Record<string, number>} spectralStats
 * @param {string} metricKey
 * @returns {string}
 */
export function formatSpectralMetric(spectralStats, metricKey) {
  const value = spectralStats?.[metricKey];
  if (!Number.isFinite(value)) {
    return "—";
  }
  if (["total", "par", "pbar", "mccree", "din"].includes(metricKey)) {
    return String(Math.round(Number(value)));
  }
  return Number(value).toFixed(3);
}

/**
 * Build y-axis ticks for the LED comparison spectrum chart.
 *
 * @param {{ mode:"relative"|"photon", maxPhotonValue:number }} input
 */
export function buildSpectrumYAxisTicks(input) {
  if (input.mode === "relative") {
    return Array.from({ length: 11 }, (_, index) => {
      const percentValue = index * 10;
      const yPosition = 220 - (percentValue / 100) * 180;
      return { value: percentValue, y: yPosition, label: `${percentValue}%` };
    });
  }
  return Array.from({ length: 11 }, (_, index) => {
    const ratio = index / 10;
    const scaledValue = ratio * input.maxPhotonValue;
    const yPosition = 220 - ratio * 180;
    return { value: scaledValue, y: yPosition, label: scaledValue.toFixed(3) };
  });
}

/**
 * Resolve the max y-value for LED series in the comparison chart.
 *
 * @param {Array<{id:string,y:number[]}>} chartSeries
 * @returns {number}
 */
export function resolveMaxLedSeriesValue(chartSeries) {
  let maximumValue = 0;
  for (const series of chartSeries) {
    if (!series.id.startsWith("led-")) {
      continue;
    }
    for (const sampleValue of series.y) {
      maximumValue = Math.max(maximumValue, Number(sampleValue) || 0);
    }
  }
  return maximumValue > 0 ? maximumValue : 1;
}

/**
 * Build SVG path data for one spectral series line.
 *
 * @param {{
 *   seriesValues:number[],
 *   nmMin:number,
 *   nmMax:number,
 *   mode:"relative"|"photon",
 *   maxPhotonValue:number
 * }} input
 * @returns {string}
 */
export function buildSpectrumSeriesPath(input) {
  const nmSpan = input.nmMax - input.nmMin;
  const innerWidth = SPECTRUM_CHART_WIDTH - SPECTRUM_CHART_PADDING * 2;
  const innerHeight = SPECTRUM_CHART_HEIGHT - SPECTRUM_CHART_PADDING * 2;
  let pathData = "";

  for (let sampleIndex = 0; sampleIndex < input.seriesValues.length; sampleIndex += 1) {
    const wavelengthNm = input.nmMin + sampleIndex;
    const xPosition =
      SPECTRUM_CHART_PADDING + ((wavelengthNm - input.nmMin) / nmSpan) * innerWidth;
    const rawValue = Number(input.seriesValues[sampleIndex]) || 0;
    const normalizedValue =
      input.mode === "relative" ? rawValue : rawValue / input.maxPhotonValue;
    const yPosition =
      SPECTRUM_CHART_PADDING + (1 - normalizedValue) * innerHeight;
    pathData +=
      sampleIndex === 0
        ? `M ${xPosition.toFixed(2)} ${yPosition.toFixed(2)}`
        : ` L ${xPosition.toFixed(2)} ${yPosition.toFixed(2)}`;
  }
  return pathData;
}
