<script setup>
import { useLedLabStore } from "@/stores/ledLabStore";
import { formatLedDisplayName, resolveBestBinLabel } from "@/catalog/ledCatalog";

const store = useLedLabStore();
const snapshot = store.snapshot;
</script>

<template>
  <details class="card collapsible-card">
    <summary class="section-header collapsible-summary">
      <h2>LED Lab</h2>
    </summary>

    <p class="note">
      Component specs and spectral datasets now flow through shared catalog and
      application services.
    </p>

    <div class="comparison-head">
      <span class="note">Compared LEDs: {{ store.state.comparedLeds.length }} / 5</span>
      <div class="compare-actions">
        <button
          class="pill"
          type="button"
          :disabled="store.state.comparedLeds.length >= 5"
          @click="store.addComparedLed()"
        >
          + Add LED
        </button>
      </div>
    </div>

    <div class="field-grid two-columns">
      <label v-for="(row, index) in store.state.comparedLeds" :key="`led-row-${index}`" class="field">
        <span>LED {{ index + 1 }}</span>
        <div class="led-row">
          <select v-model="row.id">
            <option value="">None</option>
            <option
              v-for="led in snapshot.ledOptions"
              :key="`${index}-${led.id}`"
              :value="led.id"
            >
              {{ formatLedDisplayName(led) }}
            </option>
          </select>
          <input v-model="row.color" type="color" />
          <button
            class="pill pill-remove"
            type="button"
            :disabled="store.state.comparedLeds.length <= 1"
            @click="store.removeComparedLedAt(index)"
          >
            −
          </button>
        </div>
        <span class="note led-bin-note">
          Best bin:
          {{
            row.id
              ? resolveBestBinLabel(snapshot.ledOptions.find((led) => led.id === row.id))
              : "n/a"
          }}
        </span>
      </label>
    </div>

    <div class="field-grid two-columns" style="margin-top: 10px">
      <label class="field">
        <span>SPD Mode</span>
        <div class="segmented">
          <button
            class="segmented__btn"
            :class="{ active: store.state.mode === 'relative' }"
            type="button"
            @click="store.setMode('relative')"
          >
            Relative
          </button>
          <button
            class="segmented__btn"
            :class="{ active: store.state.mode === 'photon' }"
            type="button"
            @click="store.setMode('photon')"
          >
            Photon
          </button>
        </div>
      </label>
      <div />
    </div>

    <div class="dli-table" style="margin-top: 14px">
      <div class="dli-table__header">
        <span class="stat-label">Spectral Weighting (relative)</span>
        <span class="mono"
          >{{ snapshot.points1nm }} pts (1nm) → {{ snapshot.points5nm }} pts (5nm)</span
        >
      </div>
      <p v-if="snapshot.spectralStats.error" class="note" style="margin: 0 0 10px">
        {{ snapshot.spectralStats.error }}
      </p>

      <table v-if="store.state.mode === 'photon'" class="weight-table flux-table">
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
            <td>Total photon flux (µmol/s)</td>
            <td v-for="col in snapshot.columns" :key="`flux-${col.key}`">
              {{ snapshot.formatPhotonFlux(col.photonFlux) }}
            </td>
          </tr>
        </tbody>
      </table>

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
              <td>∫ spectrum</td>
              <td v-for="col in snapshot.columns" :key="`total-${col.key}`">
                {{ snapshot.formatMetric(col.stats, "total") }}
              </td>
            </tr>
            <tr>
              <td>∫ PAR-weighted</td>
              <td v-for="col in snapshot.columns" :key="`par-w-${col.key}`">
                {{ snapshot.formatMetric(col.stats, "par") }}
              </td>
            </tr>
            <tr>
              <td>∫ PBAR-weighted</td>
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
              <td>∫ McCree-weighted</td>
              <td v-for="col in snapshot.columns" :key="`mccree-w-${col.key}`">
                {{ snapshot.formatMetric(col.stats, "mccree") }}
              </td>
            </tr>
            <tr>
              <td>∫ DIN-weighted</td>
              <td v-for="col in snapshot.columns" :key="`din-w-${col.key}`">
                {{ snapshot.formatMetric(col.stats, "din") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="dli-table" style="margin-top: 14px">
      <div class="dli-table__header">
        <span class="stat-label">Spectrum</span>
        <span class="mono">{{ snapshot.chartData.nmMin }}–{{ snapshot.chartData.nmMax }} nm</span>
      </div>
      <div class="spectrum-legend">
        <span v-for="s in snapshot.chartData.series" :key="s.id" class="spectrum-legend__item">
          <span class="spectrum-legend__swatch" :style="{ background: s.color }" />
          <span class="mono">{{ s.label }}</span>
        </span>
      </div>

      <div class="spectrum-chart">
        <svg :viewBox="`0 0 900 260`" role="img" aria-label="Spectral comparison chart">
          <rect x="0" y="0" width="900" height="260" rx="16" fill="rgba(255,255,255,0.03)" />
          <g stroke="rgba(255,255,255,0.10)" stroke-width="1">
            <line x1="60" y1="40" x2="60" y2="220" />
            <line x1="210" y1="40" x2="210" y2="220" />
            <line x1="360" y1="40" x2="360" y2="220" />
            <line x1="510" y1="40" x2="510" y2="220" />
            <line x1="660" y1="40" x2="660" y2="220" />
            <line x1="810" y1="40" x2="810" y2="220" />
            <line
              v-for="tick in snapshot.yTicks"
              :key="`grid-y-${tick.value}`"
              x1="60"
              :y1="tick.y"
              x2="840"
              :y2="tick.y"
            />
          </g>
          <g fill="rgba(255,255,255,0.55)" font-size="12" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">
            <text x="60" y="242">280</text>
            <text x="205" y="242">400</text>
            <text x="355" y="242">520</text>
            <text x="505" y="242">640</text>
            <text x="655" y="242">760</text>
            <text x="812" y="242">840</text>
            <text x="14" y="20">{{ snapshot.yAxisLabel }}</text>
            <text v-for="tick in snapshot.yTicks" :key="`tick-label-${tick.value}`" x="28" :y="tick.y + 4">
              {{ tick.label }}
            </text>
          </g>
          <g fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path
              v-for="s in snapshot.chartData.series"
              :key="s.id"
              :d="snapshot.seriesPath(s.y)"
              :stroke="s.color"
              :stroke-width="s.id.startsWith('led-') ? 2.5 : 1.25"
              :opacity="s.id.startsWith('led-') ? 0.95 : 0.35"
            />
          </g>
        </svg>
      </div>
    </div>
  </details>
</template>

<style scoped>
.comparison-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0;
}
.compare-actions {
  display: flex;
  gap: 8px;
}
.led-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.led-row input[type="color"] {
  width: 34px;
  height: 24px;
  border: 0;
  padding: 0;
  background: transparent;
}
.pill-remove {
  min-width: 32px;
  padding-inline: 0;
  text-align: center;
}
.led-bin-note {
  display: block;
  margin-top: 6px;
  opacity: 0.9;
}
.spectrum-legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: center;
  padding: 10px 8px 8px;
}
.spectrum-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.spectrum-legend__swatch {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}
.spectrum-chart {
  padding: 8px;
}
.spectrum-chart svg {
  width: 100%;
  height: auto;
  display: block;
}
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
  background: rgba(175, 255, 90, 0.12);
  border-color: rgba(175, 255, 90, 0.45);
}
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
  border: 1px solid rgba(130, 170, 210, 0.35);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(8, 18, 34, 0.35);
}
.weight-table th,
.weight-table td {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
