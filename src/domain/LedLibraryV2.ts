// LedLibraryV2.js
// Compatibility facade for the datasheet-backed LED model.

export {
  ABSOLUTE_MAXIMUM_COMMON,
  DERATING_CURVES,
  LED_CURVES,
  LUMINOUS_FLUX_BINS_LM,
  VOLTAGE_BINS,
} from "@/domain/led/ledCurves";
export {
  LM301H_EVO_CHROMATICITY_QUADS,
  LM301H_MACADAM_ELLIPSES,
} from "@/domain/led/ledChromaticity";
export { LED_LIBRARY_V2 } from "@/domain/led/ledDefinitions";
export {
  estimateLedOutput,
  getDeratedMaxCurrentMA,
  getPreferredReference,
  interpolateCurve,
  interpolateInverseCurve,
} from "@/domain/led/ledOutputModel";
export { LED_LIBRARY_V2 as LED_LIBRARY } from "@/domain/led/ledDefinitions";
