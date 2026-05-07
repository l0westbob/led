import { estimateBoardCctFromEmitters } from "@/application/planner/estimateBoardCct";
import type { EmitterFluxRow } from "@/application/planner/estimateBoardCct";
import type { AppIssue } from "@/domain/contracts";

/**
 * Build the board-preview CCT projection and associated warnings.
 *
 * @param {Array<{ledType:string, photonFluxUmolS:number}>} emitterFluxRows
 */
export function buildBoardPreviewCctSummary(emitterFluxRows: EmitterFluxRow[]) {
  const cctEstimate = estimateBoardCctFromEmitters(emitterFluxRows);
  const warnings: AppIssue[] = [];
  if (cctEstimate.warningCode) {
    warnings.push({
      code: cctEstimate.warningCode,
      message: "CCT cannot be estimated while photon flux is zero.",
      severity: "warning",
      field: "emitters",
    });
  }

  return {
    cct: {
      valueK: cctEstimate.cctK,
      method: "photon-flux-weighted-led-cct",
      confidence: "low",
      warningCode: cctEstimate.warningCode,
    },
    cctK: cctEstimate.cctK,
    warnings,
  };
}
