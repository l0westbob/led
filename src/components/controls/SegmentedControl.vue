<script setup lang="ts">
export type SegmentedControlOption = {
  label: string;
  value: string;
};

withDefaults(
  defineProps<{
    label: string;
    ariaLabel?: string;
    options: SegmentedControlOption[];
    modelValue: string;
    fieldClass?: string;
    groupClass?: string;
    buttonClass?: string;
    activeClass?: string;
  }>(),
  {
    ariaLabel: "",
    fieldClass: "field",
    groupClass: "segmented",
    buttonClass: "segmented__btn",
    activeClass: "active",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  change: [value: string];
}>();

function selectValue(value: string) {
  emit("update:modelValue", value);
  emit("change", value);
}
</script>

<template>
  <div :class="fieldClass">
    <span>{{ label }}</span>
    <div :class="groupClass" role="group" :aria-label="ariaLabel || label">
      <button
        v-for="option in options"
        :key="option.value"
        :class="[buttonClass, option.value === modelValue && activeClass]"
        type="button"
        :aria-pressed="option.value === modelValue"
        @click="selectValue(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.segmented {
  display: inline-flex;
  gap: 6px;
  padding: 6px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.segmented__btn {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.22);
  color: rgba(255, 255, 255, 0.78);
  padding: 8px 10px;
  border-radius: 10px;
}

.segmented__btn.active {
  background: var(--segmented-active-bg);
  border-color: var(--segmented-active-border);
}
</style>
