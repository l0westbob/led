import {
  buildSpectrumSeriesPath,
  buildSpectrumYAxisTicks,
  resolveMaxLedSeriesValue,
} from "@/application/ledLab/spectralComparisonMath";

/**
 * Build a reusable spectrum chart view model.
 *
 * @param {{
 *   mode:"relative"|"photon",
 *   nmMin:number,
 *   nmMax:number,
 *   series:Array<{id:string,label:string,color:string,y:number[]}>,
 *   yAxisLabelRelative?:string,
 *   yAxisLabelPhoton?:string
 * }} input
 */
export function buildSpectrumChartViewModel(input) {
  const mode = input.mode === "photon" ? "photon" : "relative";
  const maxPhotonValue = resolveMaxLedSeriesValue(input.series);
  const yTicks = buildSpectrumYAxisTicks({
    mode,
    maxPhotonValue,
  });
  const yAxisLabel =
    mode === "photon"
      ? input.yAxisLabelPhoton ?? "Photon SPD (µmol/s/nm)"
      : input.yAxisLabelRelative ?? "Relative SPD (%)";

  return {
    mode,
    nmMin: input.nmMin,
    nmMax: input.nmMax,
    series: input.series,
    yAxisLabel,
    yTicks,
    maxPhotonValue,
    seriesPath(seriesValues) {
      return buildSpectrumSeriesPath({
        seriesValues,
        nmMin: input.nmMin,
        nmMax: input.nmMax,
        mode,
        maxPhotonValue,
      });
    },
  };
}

