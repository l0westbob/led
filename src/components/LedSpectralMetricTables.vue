<script setup lang="ts">
type SpectralMetricColumn = {
  key: string;
  label: string;
  color: string;
  stats: Record<string, number | string | null>;
};

defineProps<{
  snapshot: {
    columns: SpectralMetricColumn[];
    formatMetric: (
      stats: Record<string, number | string | null>,
      key: string,
    ) => string;
  };
}>();
</script>

<template>
  <div class="weight-tables">
    <table class="weight-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th v-for="col in snapshot.columns" :key="`head-a-${col.key}`">
            <span class="table-led-head">
              <span class="table-led-dot" :style="{ background: col.color }" />
              {{ col.label }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>McCree / total</td>
          <td v-for="col in snapshot.columns" :key="`mccree-r-${col.key}`">
            {{ snapshot.formatMetric(col.stats, "mccreeRatio") }}
          </td>
        </tr>
        <tr>
          <td>DIN 5031 / total</td>
          <td v-for="col in snapshot.columns" :key="`din-r-${col.key}`">
            {{ snapshot.formatMetric(col.stats, "dinRatio") }}
          </td>
        </tr>
      </tbody>
    </table>

    <table class="weight-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th v-for="col in snapshot.columns" :key="`head-b-${col.key}`">
            <span class="table-led-head">
              <span class="table-led-dot" :style="{ background: col.color }" />
              {{ col.label }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>PAR (400-700) / total</td>
          <td v-for="col in snapshot.columns" :key="`par-r-${col.key}`">
            {{ snapshot.formatMetric(col.stats, "parRatio") }}
          </td>
        </tr>
        <tr>
          <td>PBAR (280-800) / total</td>
          <td v-for="col in snapshot.columns" :key="`pbar-r-${col.key}`">
            {{ snapshot.formatMetric(col.stats, "pbarRatio") }}
          </td>
        </tr>
      </tbody>
    </table>

    <table class="weight-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th v-for="col in snapshot.columns" :key="`head-c-${col.key}`">
            <span class="table-led-head">
              <span class="table-led-dot" :style="{ background: col.color }" />
              {{ col.label }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Integral spectrum</td>
          <td v-for="col in snapshot.columns" :key="`total-${col.key}`">
            {{ snapshot.formatMetric(col.stats, "total") }}
          </td>
        </tr>
        <tr>
          <td>Integral PAR-weighted</td>
          <td v-for="col in snapshot.columns" :key="`par-w-${col.key}`">
            {{ snapshot.formatMetric(col.stats, "par") }}
          </td>
        </tr>
        <tr>
          <td>Integral PBAR-weighted</td>
          <td v-for="col in snapshot.columns" :key="`pbar-w-${col.key}`">
            {{ snapshot.formatMetric(col.stats, "pbar") }}
          </td>
        </tr>
      </tbody>
    </table>

    <table class="weight-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th v-for="col in snapshot.columns" :key="`head-d-${col.key}`">
            <span class="table-led-head">
              <span class="table-led-dot" :style="{ background: col.color }" />
              {{ col.label }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Integral McCree-weighted</td>
          <td v-for="col in snapshot.columns" :key="`mccree-w-${col.key}`">
            {{ snapshot.formatMetric(col.stats, "mccree") }}
          </td>
        </tr>
        <tr>
          <td>Integral DIN-weighted</td>
          <td v-for="col in snapshot.columns" :key="`din-w-${col.key}`">
            {{ snapshot.formatMetric(col.stats, "din") }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.weight-tables {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}

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
</style>
