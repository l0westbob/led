import { getRotatedBoardFootprintMm } from "@/domain/boardGeometry";
import type { BoardInstance } from "@/domain/contracts";

/**
 * Resolve the rendered footprint for a board instance on the PPFD heatmap.
 *
 * @param {{
 *   boardInstance: Record<string, unknown>,
 *   fallbackBoard: { widthMm:number, depthMm:number }
 * }} input
 * @returns {{ widthMm:number, depthMm:number }}
 */
export function resolveHeatmapBoardFootprintMm(input: {
  boardInstance: Pick<BoardInstance, "widthMm" | "depthMm" | "rotationDeg">;
  fallbackBoard: { widthMm: number; depthMm: number };
}) {
  return getRotatedBoardFootprintMm({
    widthMm: Number(input.boardInstance.widthMm || input.fallbackBoard.widthMm),
    depthMm: Number(input.boardInstance.depthMm || input.fallbackBoard.depthMm),
    rotationDeg: input.boardInstance.rotationDeg,
  });
}
