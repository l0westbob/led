import { LED_LIBRARY_V2 } from "@/domain/LedLibraryV2";
import { resolveLedBins } from "@/catalog/ledBinCatalog";

/**
 * Canonical LED dataset resolution for both Planner and LED Lab.
 *
 * Centralizing this mapping is important: if Planner and LED Lab infer series
 * ids differently, they can disagree on calibrated photon output.
 *
 * @param {import("@/domain/contracts").LedDefinition | undefined | null} led
 * @returns {string|null}
 */
export function resolveLedSpectralSeriesId(led) {
  if (!led) return null;

  const family = String(led.family ?? "").toUpperCase();
  const cctK = led.cctK != null ? Number(led.cctK) : null;
  const cri = led.criMin != null ? Number(led.criMin) : led.cri != null ? Number(led.cri) : null;

  if (family.includes("EVO")) {
    if (String(led.name ?? "").toUpperCase().includes("MINT")) {
      return "LM301H-EVO-MINT-WHITE";
    }
    return cctK ? `LM301H-EVO-${cctK}K` : null;
  }

  if (cctK && cri) return `LM301H-${cri}CRI-${cctK}K`;
  return null;
}

/**
 * @param {import("@/domain/contracts").LedDefinition | undefined | null} led
 * @returns {string}
 */
export function formatLedDisplayName(led) {
  if (!led) return "";
  const family = led.family ?? "LED";
  const cct = led.cctK ? `${led.cctK}K` : "Unknown CCT";
  const isMint = String(led.name ?? "").toLowerCase().includes("mint");
  if (isMint) return `${family} - Mint White`;
  const cri = led.criMin ?? led.cri;
  return cri ? `${family} - ${cri}CRI - ${cct}` : `${family} - ${cct}`;
}

/**
 * Best-available bin label for quick comparison in UI legends.
 *
 * Priority:
 * 1) PPF range max (for bin-midpoint references)
 * 2) Highest luminous flux bin code
 *
 * @param {import("@/domain/contracts").LedDefinition | undefined | null} led
 * @returns {string}
 */
export function resolveBestBinLabel(led) {
  if (!led) return "n/a";
  const bins = resolveLedBins(led.id);
  const ppfRange = bins?.ppfRangeUmolS ?? led?.reference?.ppfRangeUmolS;
  if (Number.isFinite(ppfRange?.maxPpfUmolS)) {
    const code = bins?.ppfBinCode ? ` ${bins.ppfBinCode}` : "";
    return `PPF bin${code} (${Number(ppfRange.minPpfUmolS).toFixed(3)}–${Number(ppfRange.maxPpfUmolS).toFixed(3)} µmol/s)`;
  }
  const lmBins = Array.isArray(bins?.luminousFluxBinCodes)
    ? bins.luminousFluxBinCodes
    : Array.isArray(led?.luminousFluxBinCodes)
    ? led.luminousFluxBinCodes
    : [];
  if (lmBins.length > 0) {
    const bestCode = lmBins[lmBins.length - 1];
    const lmRange = led?.luminousFluxBinsLm?.[bestCode];
    if (Number.isFinite(lmRange?.minLm) && Number.isFinite(lmRange?.maxLm)) {
      return `Lm bin ${bestCode} (${Number(lmRange.minLm).toFixed(1)}–${Number(lmRange.maxLm).toFixed(1)} lm)`;
    }
    return `Lm bin ${bestCode}`;
  }
  return "n/a";
}

/**
 * @param {string} ledId
 * @returns {import("@/domain/contracts").LedDefinition | null}
 */
export function resolveLedDefinition(ledId) {
  const led = LED_LIBRARY_V2[ledId];
  if (!led) return null;
  return {
    ...led,
    spectralSeriesId: resolveLedSpectralSeriesId(led),
  };
}

/**
 * @returns {import("@/domain/contracts").LedDefinition[]}
 */
export function listLedDefinitions() {
  return Object.values(LED_LIBRARY_V2).map((led) => ({
    ...led,
    spectralSeriesId: resolveLedSpectralSeriesId(led),
  }));
}
