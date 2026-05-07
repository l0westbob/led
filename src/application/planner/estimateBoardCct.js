import { resolveLedDefinition } from "@/catalog/ledCatalog";

/**
 * Estimate board CCT from emitter-level LED variants and their photon flux.
 *
 * This MVP estimate is a photon-flux-weighted average of the nominal LED CCT
 * values and is intentionally conservative. It is not a chromaticity-derived
 * CCT from CIE x/y yet.
 *
 * @param {Array<{ledType:string, photonFluxUmolS:number}>} emitterFluxRows
 * @returns {{ cctK:number|null, warningCode:string|null }}
 */
export function estimateBoardCctFromEmitters(emitterFluxRows) {
  let weightedCctSum = 0;
  let totalFlux = 0;

  for (const emitterFluxRow of emitterFluxRows) {
    const ledDefinition = resolveLedDefinition(emitterFluxRow.ledType);
    const nominalCctK = Number(ledDefinition?.cctK) || 0;
    const photonFluxUmolS = Math.max(0, Number(emitterFluxRow.photonFluxUmolS) || 0);
    if (nominalCctK <= 0 || photonFluxUmolS <= 0) continue;
    weightedCctSum += nominalCctK * photonFluxUmolS;
    totalFlux += photonFluxUmolS;
  }

  if (totalFlux <= 0) {
    return { cctK: null, warningCode: "CCT_NOT_COMPUTABLE_ZERO_FLUX" };
  }

  return {
    cctK: Math.round(weightedCctSum / totalFlux),
    warningCode: null,
  };
}

/**
 * Phase-2-ready interface for chromaticity-based CCT estimation.
 *
 * Current implementation intentionally returns a structured placeholder until a
 * validated CIE x/y + CCT method is integrated.
 *
 * @param {{ wavelengthNm:number[], values:number[] }} _photonSpectrum
 * @returns {{ cctK:number|null, warningCode:string|null }}
 */
export function estimateBoardCctFromSpectrum(_photonSpectrum) {
  return {
    cctK: null,
    warningCode: "CCT_CHROMATICITY_METHOD_NOT_IMPLEMENTED",
  };
}
