<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
}>();
</script>

<template>
  <div class="stat">
    <span class="stat-label">{{ label }}</span>
    <strong class="stat-value">{{ value }}</strong>
  </div>
</template>
