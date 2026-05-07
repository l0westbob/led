<script setup lang="ts">
type PhotonFluxColumn = {
  key: string;
  label: string;
  color: string;
  photonFlux: number | null;
};

defineProps<{
  snapshot: {
    columns: PhotonFluxColumn[];
    formatPhotonFlux: (value: number | null) => string;
  };
}>();
</script>

<template>
  <table class="weight-table flux-table">
    <thead>
      <tr>
        <th>Metric</th>
        <th v-for="col in snapshot.columns" :key="`head-flux-${col.key}`">
          <span class="table-led-head">
            <span class="table-led-dot" :style="{ background: col.color }" />
            {{ col.label }}
          </span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Total photon flux (umol/s)</td>
        <td v-for="col in snapshot.columns" :key="`flux-${col.key}`">
          {{ snapshot.formatPhotonFlux(col.photonFlux) }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.weight-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 360px;
  max-width: 100%;
  flex: 1 1 360px;
  border: 1px solid var(--line-table);
  border-radius: 10px;
  overflow: hidden;
  background: var(--panel-bg-subtle);
}

.weight-table th,
.weight-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--line-subtle);
}

.weight-table th:first-child,
.weight-table td:first-child {
  width: 34%;
  text-align: left;
}

.weight-table th:not(:first-child),
.weight-table td:not(:first-child) {
  width: calc(66% / 5);
  text-align: right;
}

.table-led-head {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
  width: 100%;
  white-space: nowrap;
}

.table-led-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}

.flux-table {
  min-width: 100%;
  max-width: 100%;
  margin-bottom: 10px;
}
</style>
