<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";

type PlannerModalSize = "standard" | "wide";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    labelId?: string;
    size?: PlannerModalSize;
  }>(),
  {
    labelId: "",
    size: "standard",
  },
);

const emit = defineEmits<{
  close: [];
}>();
const generatedId = useId();
const dialogRef = ref<HTMLElement | null>(null);
const previousFocusedElement = ref<HTMLElement | null>(null);
const resolvedLabelId = computed(() => props.labelId || `${generatedId}-title`);
const sizeClass = computed(() =>
  props.size === "wide" ? "modal-card-wide" : "modal-card-standard",
);

function isFocusableElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement && !value.hasAttribute("disabled");
}

function rememberFocusedElement() {
  if (typeof document === "undefined") return;
  const activeElement = document.activeElement;
  if (isFocusableElement(activeElement)) {
    previousFocusedElement.value = activeElement;
  }
}

async function focusFirstActionableControl() {
  await nextTick();
  const dialog = dialogRef.value;
  if (!dialog) return;

  const firstControl = dialog.querySelector(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (isFocusableElement(firstControl)) {
    firstControl.focus();
    return;
  }
  dialog.focus();
}

function returnFocus() {
  const previousElement = previousFocusedElement.value;
  previousFocusedElement.value = null;
  if (isFocusableElement(previousElement) && previousElement.isConnected) {
    previousElement.focus();
  }
}

function requestClose() {
  emit("close");
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      rememberFocusedElement();
      focusFirstActionableControl();
    } else {
      returnFocus();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  returnFocus();
});
</script>

<template>
  <div
    v-if="open"
    class="modal-backdrop"
    @keydown.esc.stop.prevent="requestClose"
  >
    <div
      ref="dialogRef"
      class="modal-card"
      :class="sizeClass"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="resolvedLabelId"
      tabindex="-1"
    >
      <div class="section-header">
        <h2 :id="resolvedLabelId">{{ title }}</h2>
        <slot name="header-meta" />
      </div>

      <slot />
    </div>
  </div>
</template>

<style>
.modal-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--modal-backdrop);
  backdrop-filter: blur(8px);
  z-index: 1200;
  padding: 20px;
}

.modal-card {
  width: min(760px, 100%);
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--modal-bg);
  padding: 16px;
}

.modal-card-standard {
  width: min(760px, 100%);
}

.modal-card-wide {
  width: min(820px, 100%);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
</style>
