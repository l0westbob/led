import type { Ref } from "vue";

type ResizableCanvasInput = {
  containerRef: Ref<HTMLElement | null>;
  canvasRef: Ref<HTMLCanvasElement | null>;
  canvasWidth: Ref<number>;
  canvasHeight: Ref<number>;
  aspectRatio: () => number;
  onResize?: () => void;
};

/**
 * Keep a canvas backing store aligned with its container and room aspect ratio.
 */
export function useResizableCanvas(input: ResizableCanvasInput) {
  let resizeObserver: ResizeObserver | null = null;

  function resizeCanvasToContainer() {
    const container = input.containerRef.value;
    const canvas = input.canvasRef.value;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const ratio = input.aspectRatio();

    let cssWidth = rect.width;
    let cssHeight = cssWidth / ratio;
    if (cssHeight > rect.height) {
      cssHeight = rect.height;
      cssWidth = cssHeight * ratio;
    }

    const dpr = window.devicePixelRatio || 1;
    input.canvasWidth.value = Math.max(1, Math.round(cssWidth * dpr));
    input.canvasHeight.value = Math.max(1, Math.round(cssHeight * dpr));

    canvas.width = input.canvasWidth.value;
    canvas.height = input.canvasHeight.value;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
  }

  function startResizeObserver() {
    resizeCanvasToContainer();
    resizeObserver = new ResizeObserver(() => {
      resizeCanvasToContainer();
      input.onResize?.();
    });
    if (input.containerRef.value) {
      resizeObserver.observe(input.containerRef.value);
    }
  }

  function stopResizeObserver() {
    resizeObserver?.disconnect();
    resizeObserver = null;
  }

  return {
    resizeCanvasToContainer,
    startResizeObserver,
    stopResizeObserver,
  };
}
