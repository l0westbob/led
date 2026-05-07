import { listLedDefinitions } from "@/catalog/ledCatalog";
import {
  loadSavedBoards,
  loadSavedBoardsWithReport,
  saveBoardCollection,
  saveBoardCollectionWithReport,
} from "@/utils/storage";
import { applyBoardSelection } from "@/application/planner/mutations";
import { normalizeBoardPlannerEmitters } from "@/application/planner/boardPlannerEmitters";
import { createPlannerUseCases } from "@/application/planner/plannerUseCases";
import {
  createPlannerFormState,
  createPlannerState,
} from "@/stores/planner/plannerState";
import { createPlannerSelectors } from "@/stores/planner/plannerSelectors";
import { createPlannerLifecycle } from "@/stores/planner/plannerLifecycle";
import type {
  BoardOption,
  PlannerUseCaseDependencies,
} from "@/application/planner/useCases/contracts";
import type { BoardDefinition } from "@/domain/contracts";

const STORAGE_KEY = "led-ppfd-planner.boards";
const boardStorageAdapter = {
  loadSavedBoards,
  loadSavedBoardsWithReport,
  saveBoardCollection,
  saveBoardCollectionWithReport,
};

type PlannerStoreOptions = {
  storageKey?: string;
  storageAdapter?: typeof boardStorageAdapter;
  dependencies?: PlannerUseCaseDependencies["dependencies"];
};

function roundToTwoDecimals(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Planner store for the "real version" architecture.
 *
 * Responsibilities:
 * - Own form and selection state
 * - Persist/load custom boards
 * - Delegate all electrical/photon/PPFD work to application services
 * - Keep Vue watchers thin and deterministic
 */
export function createPlannerStore(options: PlannerStoreOptions = {}) {
  const storageKey = options.storageKey ?? STORAGE_KEY;
  const storageAdapter = options.storageAdapter ?? boardStorageAdapter;
  const state = createPlannerState({ migrateLedType });

  function createFormState(source: Partial<BoardDefinition>) {
    return createPlannerFormState(source, { migrateLedType });
  }

  function overwriteForm(source: BoardOption | BoardDefinition) {
    const normalized = applyBoardSelection(source, migrateLedType);
    Object.assign(state.form, normalized);
    state.form.emitters = normalizeBoardPlannerEmitters(state.form);
    if (
      !state.selectedBoardPlannerEmitterId &&
      state.form.emitters.length > 0
    ) {
      state.selectedBoardPlannerEmitterId = state.form.emitters[0].id;
    }
    plannerUseCases.sanitizeEmitterSelection();
  }

  function setResolution(resolutionCm: number) {
    state.resolutionCm = resolutionCm;
  }

  const plannerUseCases = createPlannerUseCases({
    state,
    storageKey,
    storageAdapter,
    migrateLedType,
    overwriteForm,
    roundToTwoDecimals,
    dependencies: options.dependencies,
  });
  const lifecycle = createPlannerLifecycle({
    state,
    plannerUseCases,
    createFormState,
    overwriteForm,
  });

  lifecycle.initializeStore();
  const selectors = createPlannerSelectors(state);

  return {
    state,
    form: state.form,
    ledTypes: listLedDefinitions(),
    ...selectors,
    setResolution,
    dispose: lifecycle.dispose,
    ...plannerUseCases,
  };
}

export type PlannerStore = ReturnType<typeof createPlannerStore>;

let singletonPlannerStore: PlannerStore | null = null;

export function usePlannerStore() {
  if (!singletonPlannerStore) {
    singletonPlannerStore = createPlannerStore();
  }
  return singletonPlannerStore;
}

function migrateLedType(ledType: string | null | undefined): string {
  const known = new Set(listLedDefinitions().map((led) => led.id));
  if (ledType && known.has(ledType)) return ledType;

  const legacyMap: Record<string, string> = {
    lm301h: "lm301h_cri80_5000k",
    osram3030: "lm301h_cri80_5000k",
    creexpe2: "lm301h_cri80_5000k",
  };

  return legacyMap[ledType ?? ""] ?? "lm301h_cri80_5000k";
}
