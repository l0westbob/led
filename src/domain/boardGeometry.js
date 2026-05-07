/**
 * Shared board geometry helpers used by:
 * - planner placement validation
 * - heatmap footprint rendering
 * - planner emitter rotation during PPFD estimation
 *
 * Keeping these functions in one domain module prevents drift between UI
 * preview behavior and compute behavior.
 */

/**
 * Normalize any degree value to quarter-turn rotations (0, 90, 180, 270).
 *
 * @param {number} rotationDeg
 * @returns {0|90|180|270}
 */
export function normalizeQuarterTurnRotation(rotationDeg) {
  const rawDegrees = Number(rotationDeg) || 0;
  const quarterTurns = Math.round(rawDegrees / 90);
  const normalizedTurns = ((quarterTurns % 4) + 4) % 4;
  return /** @type {0|90|180|270} */ (normalizedTurns * 90);
}

/**
 * Resolve the effective board footprint in millimeters after a quarter-turn.
 *
 * @param {{ widthMm:number, depthMm:number, rotationDeg?:number }} input
 * @returns {{ widthMm:number, depthMm:number }}
 */
export function getRotatedBoardFootprintMm(input) {
  const baseWidthMm = Number(input.widthMm) || 0;
  const baseDepthMm = Number(input.depthMm) || 0;
  const normalizedRotation = normalizeQuarterTurnRotation(input.rotationDeg ?? 0);
  const swapsAxes = normalizedRotation === 90 || normalizedRotation === 270;
  return swapsAxes
    ? { widthMm: baseDepthMm, depthMm: baseWidthMm }
    : { widthMm: baseWidthMm, depthMm: baseDepthMm };
}

/**
 * Rotate emitter coordinates around board center in quarter turns.
 *
 * @param {Array<{xMm:number,yMm:number,type?:string}>} emitters
 * @param {{ widthMm:number, depthMm:number, rotationDeg?:number }} board
 * @returns {{
 *   emitters: Array<{xMm:number,yMm:number,type?:string}>,
 *   widthMm:number,
 *   depthMm:number
 * }}
 */
export function rotateEmittersWithBoard(emitters, board) {
  const normalizedRotation = normalizeQuarterTurnRotation(board.rotationDeg ?? 0);
  const baseWidthMm = Number(board.widthMm) || 0;
  const baseDepthMm = Number(board.depthMm) || 0;
  if (normalizedRotation === 0) {
    return { emitters, widthMm: baseWidthMm, depthMm: baseDepthMm };
  }

  const centerX = baseWidthMm * 0.5;
  const centerY = baseDepthMm * 0.5;
  let rotatedWidthMm = baseWidthMm;
  let rotatedDepthMm = baseDepthMm;

  const rotatedEmitters = emitters.map((emitter) => {
    const emitterX = Number(emitter.xMm) || 0;
    const emitterY = Number(emitter.yMm) || 0;
    const deltaX = emitterX - centerX;
    const deltaY = emitterY - centerY;
    let rotatedX = emitterX;
    let rotatedY = emitterY;

    if (normalizedRotation === 90) {
      rotatedX = centerX - deltaY;
      rotatedY = centerY + deltaX;
      rotatedWidthMm = baseDepthMm;
      rotatedDepthMm = baseWidthMm;
    } else if (normalizedRotation === 180) {
      rotatedX = centerX - deltaX;
      rotatedY = centerY - deltaY;
    } else if (normalizedRotation === 270) {
      rotatedX = centerX + deltaY;
      rotatedY = centerY - deltaX;
      rotatedWidthMm = baseDepthMm;
      rotatedDepthMm = baseWidthMm;
    }

    return {
      ...emitter,
      xMm: rotatedX,
      yMm: rotatedY,
    };
  });

  if (normalizedRotation === 90 || normalizedRotation === 270) {
    const shiftX = (rotatedWidthMm - baseWidthMm) * 0.5;
    const shiftY = (rotatedDepthMm - baseDepthMm) * 0.5;
    return {
      emitters: rotatedEmitters.map((emitter) => ({
        ...emitter,
        xMm: emitter.xMm + shiftX,
        yMm: emitter.yMm + shiftY,
      })),
      widthMm: rotatedWidthMm,
      depthMm: rotatedDepthMm,
    };
  }

  return {
    emitters: rotatedEmitters,
    widthMm: rotatedWidthMm,
    depthMm: rotatedDepthMm,
  };
}

/**
 * Convert board footprint to centimeters using its rotation.
 *
 * @param {{ widthMm:number, depthMm:number, rotationDeg?:number }} input
 * @returns {{ widthCm:number, depthCm:number }}
 */
export function getRotatedBoardFootprintCm(input) {
  const footprintMm = getRotatedBoardFootprintMm(input);
  return {
    widthCm: footprintMm.widthMm / 10,
    depthCm: footprintMm.depthMm / 10,
  };
}
