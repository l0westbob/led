/**
 * Coalesce heatmap canvas paints into animation frames.
 */
export function useScheduledCanvasRender(renderNow: () => void) {
  let frameId = 0;

  function cancelScheduledRender() {
    if (!frameId) return;
    cancelAnimationFrame(frameId);
    frameId = 0;
  }

  function renderImmediately() {
    cancelScheduledRender();
    renderNow();
  }

  function scheduleRender() {
    if (frameId) return;
    frameId = requestAnimationFrame(() => {
      frameId = 0;
      renderNow();
    });
  }

  return {
    cancelScheduledRender,
    renderImmediately,
    scheduleRender,
  };
}
