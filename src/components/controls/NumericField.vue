<script setup lang="ts">
import { useId } from "vue";

type NumericFieldValue = number | string;

withDefaults(
  defineProps<{
    label: string;
    modelValue: NumericFieldValue;
    min?: NumericFieldValue;
    max?: NumericFieldValue;
    step?: NumericFieldValue;
    fieldClass?: string;
    inputClass?: string;
    title?: string;
  }>(),
  {
    min: undefined,
    max: undefined,
    step: undefined,
    fieldClass: "field",
    inputClass: "",
    title: "",
  },
);

const emit = defineEmits<{
  "input-value": [value: string];
}>();
const inputId = useId();

function handleInput(event: Event) {
  emit("input-value", (event.target as HTMLInputElement).value);
}
</script>

<template>
  <div :class="fieldClass">
    <label :for="inputId">
      <span>{{ label }}</span>
    </label>
    <input
      :id="inputId"
      :value="modelValue"
      type="number"
      :min="min"
      :max="max"
      :step="step"
      :class="inputClass"
      :title="title || undefined"
      @input="handleInput"
    />
    <slot />
  </div>
</template>
