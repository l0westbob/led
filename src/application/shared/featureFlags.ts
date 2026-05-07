/**
 * Runtime feature flags used for phased migration and rollback-safe releases.
 *
 * Flags may be overridden in dev by setting:
 * `window.__LED_PLANNER_FLAGS__ = { "flag.name": true }`
 */

declare global {
  interface Window {
    __LED_PLANNER_FLAGS__?: Record<string, boolean>;
  }
}

const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {};

function resolveRuntimeOverrides(): Record<string, boolean> {
  if (typeof window === "undefined") {
    return {};
  }
  const raw = window.__LED_PLANNER_FLAGS__;
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw;
}

/**
 * Resolve one feature flag with a safe default fallback.
 */
export function isFeatureEnabled(flagName: string): boolean {
  const runtimeOverrides = resolveRuntimeOverrides();
  if (Object.hasOwn(runtimeOverrides, flagName)) {
    return Boolean(runtimeOverrides[flagName]);
  }
  return Boolean(DEFAULT_FEATURE_FLAGS[flagName]);
}

export function listFeatureFlags(): Record<string, boolean> {
  const runtimeOverrides = resolveRuntimeOverrides();
  return {
    ...DEFAULT_FEATURE_FLAGS,
    ...runtimeOverrides,
  };
}
