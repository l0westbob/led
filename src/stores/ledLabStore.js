import { computed, reactive } from "vue";
import { resolveLedDefinition } from "@/catalog/ledCatalog";
import { buildLedComparisonSnapshot } from "@/application/ledLab/buildLedComparisonSnapshot";

const firstLed = resolveLedDefinition("lm301h_cri80_5000k");
const palette = ["#ffaa3c", "#ff5fa2", "#56e1ff", "#8cff8c", "#c8a0ff"];

const state = reactive({
  mode: "relative",
  comparedLeds: [{ id: firstLed?.id ?? "", color: palette[0] }],
});

/**
 * LED Lab store:
 * - owns compared LED rows and display mode
 * - delegates derived chart/table VM to application service
 */
export function useLedLabStore() {
  const snapshot = computed(() =>
    buildLedComparisonSnapshot({
      comparedLeds: state.comparedLeds,
      mode: state.mode,
      fallbackLedId: firstLed?.id ?? "",
    }),
  );

  function addComparedLed() {
    if (state.comparedLeds.length >= 5) return;
    state.comparedLeds.push({
      id: "",
      color: palette[state.comparedLeds.length % palette.length],
    });
  }

  function removeComparedLedAt(index) {
    if (state.comparedLeds.length <= 1) return;
    state.comparedLeds.splice(index, 1);
  }

  function setMode(mode) {
    state.mode = mode === "photon" ? "photon" : "relative";
  }

  return {
    state,
    snapshot,
    addComparedLed,
    removeComparedLedAt,
    setMode,
  };
}
