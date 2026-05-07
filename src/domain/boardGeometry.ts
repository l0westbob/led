/**
 * Shared board geometry helpers used by:
 * - planner placement validation
 * - heatmap footprint rendering
 * - planner emitter rotation during PPFD estimation
 *
 * Keeping these functions in one domain module prevents drift between UI
 * preview behavior and compute behavior.
 */

export type QuarterTurnRotation = 0 | 90 | 180 | 270;

export type BoardFootprintInput = {
  widthMm: number;
  depthMm: number;
  rotationDeg?: number;
};

export type RotatableEmitter = {
  xMm: number;
  yMm: number;
  type?: string;
};

export type RotatedEmittersResult = {
  emitters: RotatableEmitter[];
  widthMm: number;
  depthMm: number;
};

export function normalizeQuarterTurnRotation(
  rotationDeg: number,
): QuarterTurnRotation {
  const rawDegrees = Number(rotationDeg) || 0;
  const quarterTurns = Math.round(rawDegrees / 90);
  const normalizedTurns = ((quarterTurns % 4) + 4) % 4;
  return (normalizedTurns * 90) as QuarterTurnRotation;
}

export function getRotatedBoardFootprintMm(input: BoardFootprintInput): {
  widthMm: number;
  depthMm: number;
} {
  const baseWidthMm = Number(input.widthMm) || 0;
  const baseDepthMm = Number(input.depthMm) || 0;
  const normalizedRotation = normalizeQuarterTurnRotation(
    input.rotationDeg ?? 0,
  );
  const swapsAxes = normalizedRotation === 90 || normalizedRotation === 270;
  return swapsAxes
    ? { widthMm: baseDepthMm, depthMm: baseWidthMm }
    : { widthMm: baseWidthMm, depthMm: baseDepthMm };
}

export function rotateEmittersWithBoard(
  emitters: RotatableEmitter[],
  board: BoardFootprintInput,
): RotatedEmittersResult {
  const normalizedRotation = normalizeQuarterTurnRotation(
    board.rotationDeg ?? 0,
  );
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

export function getRotatedBoardFootprintCm(input: BoardFootprintInput): {
  widthCm: number;
  depthCm: number;
} {
  const footprintMm = getRotatedBoardFootprintMm(input);
  return {
    widthCm: footprintMm.widthMm / 10,
    depthCm: footprintMm.depthMm / 10,
  };
}
