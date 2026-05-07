import type { LedDefinition } from "@/domain/contracts";

/**
 * Build a spectral dataset id from an LM301H-family LED definition.
 */
export function seriesIdForLed(
  led: Partial<LedDefinition> | null,
): string | null {
  const family = String(led?.family ?? "").toUpperCase();
  const cctK = led?.cctK != null ? Number(led.cctK) : null;
  const cri =
    led?.criMin != null
      ? Number(led.criMin)
      : led?.cri != null
        ? Number(led.cri)
        : null;

  if (family.includes("EVO")) {
    if (
      String(led?.name ?? "")
        .toUpperCase()
        .includes("MINT")
    ) {
      return "LM301H-EVO-MINT-WHITE";
    }
    if (cctK) return `LM301H-EVO-${cctK}K`;
    return null;
  }

  if (cctK && cri) return `LM301H-${cri}CRI-${cctK}K`;
  return null;
}
