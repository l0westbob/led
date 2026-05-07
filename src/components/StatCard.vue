<script setup>
defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <div class="stat">
    <span class="stat-label">{{ label }}</span>
    <strong class="stat-value">{{ value }}</strong>
  </div>
</template>
