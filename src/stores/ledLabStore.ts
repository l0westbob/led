import { computed, reactive } from "vue";
import { resolveLedDefinition } from "@/catalog/ledCatalog";
import { buildLedComparisonSnapshotEnvelope } from "@/application/ledLab/buildLedComparisonSnapshot";
import { buildIssueBucketsFromEnvelope } from "@/stores/planner/modules/issueBuckets";

export type LedLabMode = "relative" | "photon";
export type ComparedLedRow = { id: string; color: string };

const firstLed = resolveLedDefinition("lm301h_cri80_5000k");
const palette = ["#ffaa3c", "#ff5fa2", "#56e1ff", "#8cff8c", "#c8a0ff"];

/**
 * LED Lab store:
 * - owns compared LED rows and display mode
 * - delegates derived chart/table VM to application service
 */
export function createLedLabStore() {
  const state = reactive<{ mode: LedLabMode; comparedLeds: ComparedLedRow[] }>({
    mode: "relative",
    comparedLeds: [{ id: firstLed?.id ?? "", color: palette[0] }],
  });
  const snapshotEnvelope = computed(() =>
    buildLedComparisonSnapshotEnvelope({
      comparedLeds: state.comparedLeds,
      mode: state.mode,
      fallbackLedId: firstLed?.id ?? "",
    }),
  );
  const issueBuckets = computed(() =>
    buildIssueBucketsFromEnvelope(snapshotEnvelope.value),
  );
  const snapshot = computed(() => snapshotEnvelope.value.data);

  function addComparedLed() {
    if (state.comparedLeds.length >= 5) return;
    state.comparedLeds.push({
      id: "",
      color: palette[state.comparedLeds.length % palette.length],
    });
  }

  function removeComparedLedAt(index: number) {
    if (state.comparedLeds.length <= 1) return;
    state.comparedLeds.splice(index, 1);
  }

  function setMode(mode: string) {
    state.mode = mode === "photon" ? "photon" : "relative";
  }

  return {
    state,
    snapshot,
    warnings: computed(() => issueBuckets.value.warnings),
    errors: computed(() => issueBuckets.value.errors),
    addComparedLed,
    removeComparedLedAt,
    setMode,
  };
}

export type LedLabStore = ReturnType<typeof createLedLabStore>;

let singletonLedLabStore: LedLabStore | null = null;

export function useLedLabStore() {
  if (!singletonLedLabStore) {
    singletonLedLabStore = createLedLabStore();
  }
  return singletonLedLabStore;
}
