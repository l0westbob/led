import { inject, provide } from "vue";

const plannerStoreKey = Symbol("planner-store");

/**
 * Makes the shared planner store available to descendant components.
 *
 * @param {object} store
 */
export function providePlannerStore(store) {
  provide(plannerStoreKey, store);
}

/**
 * Reads the shared planner store from Vue's dependency injection context.
 *
 * @returns {object}
 */
export function usePlannerContext() {
  const store = inject(plannerStoreKey);

  if (!store) {
    throw new Error(
      "Planner store is not available in the current component tree.",
    );
  }

  return store;
}
