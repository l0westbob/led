/**
 * Project selected emitter ids against currently available emitters.
 *
 * @param {{
 *   emitters:Array<{id:string}>,
 *   selectedEmitterId?: string,
 *   selectedEmitterIds?: string[]
 * }} input
 */
export function projectBoardPreviewEmitterSelection<
  TEmitter extends { id: string },
>(input: {
  emitters: TEmitter[];
  selectedEmitterId?: string;
  selectedEmitterIds?: string[];
}) {
  const emitterById = new Map(
    input.emitters.map((emitter) => [emitter.id, emitter]),
  );
  const selectedEmitterIds = [
    ...new Set(
      (input.selectedEmitterIds ?? []).filter((selectedEmitterId) =>
        emitterById.has(selectedEmitterId),
      ),
    ),
  ];

  return {
    selectedEmitter: emitterById.get(input.selectedEmitterId ?? "") ?? null,
    selectedEmitterIds,
    selectedEmitterCount: selectedEmitterIds.length,
  };
}
