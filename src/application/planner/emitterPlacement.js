/**
 * Clamp an emitter position to stay inside board bounds.
 *
 * @param {{
 *  xMm:number,
 *  yMm:number,
 *  boardWidthMm:number,
 *  boardDepthMm:number,
 *  snapStepMm?:number
 * }} input
 */
export function clampEmitterPosition(input) {
  const snapStepMm = Number(input.snapStepMm) > 0 ? Number(input.snapStepMm) : 1;
  const boardWidthMm = Math.max(0, Number(input.boardWidthMm) || 0);
  const boardDepthMm = Math.max(0, Number(input.boardDepthMm) || 0);
  const snappedX = Math.round((Number(input.xMm) || 0) / snapStepMm) * snapStepMm;
  const snappedY = Math.round((Number(input.yMm) || 0) / snapStepMm) * snapStepMm;
  const xMm = Math.min(boardWidthMm, Math.max(0, snappedX));
  const yMm = Math.min(boardDepthMm, Math.max(0, snappedY));
  return { xMm, yMm };
}

