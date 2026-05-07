/**
 * Dedicated LED bin catalog.
 *
 * Purpose:
 * - Keep bin-related data separate from core LED electrical/spectral definitions.
 * - Provide one place to evolve bin metadata (lm bins, PPF bins, chromaticity bins).
 *
 * Note:
 * - EVO PPF bins were cross-checked against `pdf/Data_Sheet_LM301H_EVO_Rev.2.1.pdf`
 *   (section "a) PPF Bins (IF = 65 mA, Ts = 25℃)").
 */

/** @type {Record<string, { luminousFluxBinCodes?: string[], ppfRangeUmolS?: { minPpfUmolS:number, maxPpfUmolS:number } }>} */
export const LED_BIN_CATALOG = {
  lm301h_cri70_3000k: { luminousFluxBinCodes: ["SJ", "SK", "SL"] },
  lm301h_cri70_3500k: { luminousFluxBinCodes: ["SJ", "SK", "SL"] },
  lm301h_cri70_4000k: { luminousFluxBinCodes: ["SK", "SL", "SM"] },
  lm301h_cri70_5000k: { luminousFluxBinCodes: ["SK", "SL", "SM"] },
  lm301h_cri70_5700k: { luminousFluxBinCodes: ["SK", "SL", "SM"] },

  lm301h_cri80_2200k: { luminousFluxBinCodes: ["SF", "SG", "SH"] },
  lm301h_cri80_2700k: { luminousFluxBinCodes: ["SH", "SJ", "SK"] },
  lm301h_cri80_3000k: { luminousFluxBinCodes: ["SJ", "SK", "SL"] },
  lm301h_cri80_3500k: { luminousFluxBinCodes: ["SJ", "SK", "SL"] },
  lm301h_cri80_4000k: { luminousFluxBinCodes: ["SK", "SL"] },
  lm301h_cri80_5000k: { luminousFluxBinCodes: ["SK", "SL", "SM"] },
  lm301h_cri80_5700k: { luminousFluxBinCodes: ["SK", "SL"] },
  lm301h_cri80_6500k: { luminousFluxBinCodes: ["SK", "SL"] },

  lm301h_cri90_2700k: { luminousFluxBinCodes: ["SF", "SG"] },
  lm301h_cri90_3000k: { luminousFluxBinCodes: ["SF", "SG"] },
  lm301h_cri90_3500k: { luminousFluxBinCodes: ["SG", "SH"] },
  lm301h_cri90_4000k: { luminousFluxBinCodes: ["SG", "SH"] },
  lm301h_cri90_5000k: { luminousFluxBinCodes: ["SG", "SH", "SJ"] },
  lm301h_cri90_5700k: { luminousFluxBinCodes: ["SG", "SH", "SJ"] },
  lm301h_cri90_6500k: { luminousFluxBinCodes: ["SG", "SH", "SJ"] },

  // EVO PPF bins from Data_Sheet_LM301H_EVO_Rev.2.1.pdf
  lm301h_evo_3000k: { ppfBinCode: "PV", ppfRangeUmolS: { minPpfUmolS: 0.494, maxPpfUmolS: 0.557 } },
  lm301h_evo_4000k: { ppfBinCode: "PT", ppfRangeUmolS: { minPpfUmolS: 0.507, maxPpfUmolS: 0.572 } },
  lm301h_evo_5000k: { ppfBinCode: "PR", ppfRangeUmolS: { minPpfUmolS: 0.52, maxPpfUmolS: 0.587 } },
  lm301h_evo_6500k: { ppfBinCode: "PP", ppfRangeUmolS: { minPpfUmolS: 0.52, maxPpfUmolS: 0.587 } },
  lm301h_evo_mint_ma: { ppfBinCode: "PL", ppfRangeUmolS: { minPpfUmolS: 0.52, maxPpfUmolS: 0.587 } },
  lm301h_evo_mint_mb: { ppfBinCode: "PM", ppfRangeUmolS: { minPpfUmolS: 0.528, maxPpfUmolS: 0.595 } },
};

/**
 * @param {string} ledId
 */
export function resolveLedBins(ledId) {
  return LED_BIN_CATALOG[ledId] ?? {};
}
