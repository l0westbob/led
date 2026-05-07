import { inject, provide, type InjectionKey, type ShallowUnwrapRef } from "vue";
import type { PlannerStore } from "@/stores/plannerStore";

export type PlannerContextStore = ShallowUnwrapRef<PlannerStore>;

const plannerStoreKey: InjectionKey<PlannerContextStore> =
  Symbol("planner-store");

/**
 * Makes the shared planner store available to descendant components.
 */
export function providePlannerStore(store: PlannerContextStore): void {
  provide(plannerStoreKey, store);
}

/**
 * Reads the shared planner store from Vue's dependency injection context.
 */
export function usePlannerContext(): PlannerContextStore {
  const store = inject(plannerStoreKey);

  if (!store) {
    throw new Error(
      "Planner store is not available in the current component tree.",
    );
  }

  return store;
}
