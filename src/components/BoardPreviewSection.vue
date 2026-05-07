<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import { useBoardPreviewViewModel } from "@/components/boardPreview/useBoardPreviewViewModel";
import { usePlannerContext } from "@/stores/plannerContext";
import BoardPreviewCanvas from "@/components/BoardPreviewCanvas.vue";
import BoardPreviewControls from "@/components/BoardPreviewControls.vue";
import BoardPreviewSpectrumChart from "@/components/BoardPreviewSpectrumChart.vue";
import BoardPreviewSpectrumSummary from "@/components/BoardPreviewSpectrumSummary.vue";
import BoardPreviewToolbar from "@/components/BoardPreviewToolbar.vue";

const store = usePlannerContext();
const { preview, handleEscapeKey } = useBoardPreviewViewModel(store);

onMounted(() => {
  window.addEventListener("keydown", handleEscapeKey);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleEscapeKey);
});
</script>

<template>
  <details class="card collapsible-card" open>
    <summary class="section-header collapsible-summary">
      <h2>Board Preview</h2>
      <span class="mono">
        {{ preview.emitters.length }} emitters ·
        {{ Math.round(preview.totalPhotonFlux) }} umol/s
      </span>
    </summary>

    <BoardPreviewToolbar :preview="preview" />
    <BoardPreviewControls />
    <BoardPreviewCanvas :preview="preview" />
    <BoardPreviewSpectrumSummary :preview="preview" />
    <BoardPreviewSpectrumChart :preview="preview" />
  </details>
</template>
