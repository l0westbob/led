<script setup>
import { computed } from "vue";
import { usePlannerContext } from "@/stores/plannerContext";
import { buildSpectrumChartViewModel } from "@/application/ledLab/buildSpectrumChartViewModel";
import { createEmitterDragController } from "@/components/useEmitterDrag";

const store = usePlannerContext();
const preview = computed(() => store.boardPlannerPreviewSnapshot);

const viewBoxWidth = 900;
const viewBoxHeight = 360;
const padding = 24;

const boardRect = computed(() => {
  const widthMm = Number(preview.value.board.widthMm) || 1;
  const depthMm = Number(preview.value.board.depthMm) || 1;
  const scale = Math.min(
    (viewBoxWidth - padding * 2) / widthMm,
    (viewBoxHeight - padding * 2) / depthMm,
  );
  const width = widthMm * scale;
  const height = depthMm * scale;
  return {
    scale,
    x: (viewBoxWidth - width) / 2,
    y: (viewBoxHeight - height) / 2,
    width,
    height,
  };
});

function emitterPosition(emitter) {
  return {
    x: boardRect.value.x + (Number(emitter.xMm) || 0) * boardRect.value.scale,
    y: boardRect.value.y + (Number(emitter.yMm) || 0) * boardRect.value.scale,
  };
}

function emitterClassName(emitter) {
  const isSelected = store.selectedBoardPlannerEmitterId === emitter.id;
  const isOverrideLed = emitter.ledType !== store.form.ledType;
  if (isSelected && isOverrideLed) {
    return "emitter-circle selected override";
  }
  if (isSelected) {
    return "emitter-circle selected";
  }
  if (isOverrideLed) {
    return "emitter-circle override";
  }
  return "emitter-circle";
}

function toBoardCoordinates(event) {
  const svgElement = event.currentTarget.closest("svg");
  if (!svgElement) return null;
  const bounds = svgElement.getBoundingClientRect();
  const ratioX = viewBoxWidth / bounds.width;
  const ratioY = viewBoxHeight / bounds.height;
  const viewBoxX = (event.clientX - bounds.left) * ratioX;
  const viewBoxY = (event.clientY - bounds.top) * ratioY;
  const xMm = (viewBoxX - boardRect.value.x) / boardRect.value.scale;
  const yMm = (viewBoxY - boardRect.value.y) / boardRect.value.scale;
  return { xMm, yMm };
}

const emitterDragController = createEmitterDragController({
  isMoveLocked: () => store.boardPlannerEmitterMoveLocked,
  startDrag: (emitterId) => store.startEmitterDrag(emitterId),
  previewDrag: (emitterId, xMm, yMm) => store.previewEmitterPosition(emitterId, xMm, yMm),
  commitDrag: (emitterId, xMm, yMm) => store.commitEmitterPosition(emitterId, xMm, yMm),
  cancelDrag: () => store.cancelEmitterDrag(),
  selectEmitter: (emitterId) => store.selectBoardPlannerEmitter(emitterId),
  isDraggingEmitter: (emitterId) =>
    store.emitterDragState.isDragging && store.emitterDragState.emitterId === emitterId,
  toBoardCoordinates,
});

const boardSpectrumSeries = computed(() => {
  if (store.boardPlannerSpectrumMode === "photon") {
    return preview.value.aggregatePhotonSpectrum?.values ?? [];
  }
  return preview.value.aggregateRelativeSpectrum?.values ?? [];
});

const boardSpectrumChart = computed(() =>
  buildSpectrumChartViewModel({
    mode: store.boardPlannerSpectrumMode,
    nmMin: 280,
    nmMax: 840,
    series: [
      {
        id: "board-spectrum",
        label: "Board Spectrum",
        color: "#56e1ff",
        y: boardSpectrumSeries.value,
      },
    ],
  }),
);
</script>

<template>
  <details class="card collapsible-card" open>
    <summary class="section-header collapsible-summary">
      <h2>Board Preview</h2>
      <span class="mono">
        {{ preview.emitters.length }} emitters · {{ Math.round(preview.totalPhotonFlux) }} umol/s
      </span>
    </summary>

    <div class="section-header">
      <div class="pill-row">
        <button class="ghost-button" type="button" @click="store.regenerateBoardPlannerEmittersFromGrid()">
          Regenerate Grid
        </button>
        <button class="ghost-button" type="button" @click="store.resetBoardPlannerEmittersToDefaultLed()">
          Reset LEDs to Default
        </button>
      </div>
      <button
        class="ghost-button"
        type="button"
        @click="store.setBoardPlannerEmitterMoveLocked(!store.boardPlannerEmitterMoveLocked)"
      >
        {{ store.boardPlannerEmitterMoveLocked ? "🔒 Move Locked" : "🔓 Move Unlocked" }}
      </button>
      <button
        class="ghost-button"
        type="button"
        :disabled="!store.selectedBoardPlannerEmitterId"
        @click="store.openEmitterConfig(store.selectedBoardPlannerEmitterId)"
      >
        Config Selected Emitter
      </button>
    </div>

    <div class="preview-controls-grid">
      <div class="control-group">
        <h3 class="control-group-title">Default LED Drive</h3>
        <div class="mini-drive-row">
          <label class="mini-drive-field led-select-field">
            <span>Default LED</span>
            <select v-model="store.form.ledType" class="mini-drive-input led-select-input">
              <option v-for="ledType in store.ledTypes" :key="ledType.id" :value="ledType.id">
                {{ ledType.name }}
              </option>
            </select>
          </label>
          <label class="mini-drive-field">
            <span>Mode</span>
            <div class="mode-button-group">
              <button
                :class="[
                  'pill-button mode-pill',
                  store.boardPlannerDefaultEmitterDrive.driveMode === 'constantVoltage' && 'active',
                ]"
                type="button"
                @click="store.setBoardPlannerDefaultEmitterDriveMode('constantVoltage')"
              >
                Constant Voltage
              </button>
              <button
                :class="[
                  'pill-button mode-pill',
                  store.boardPlannerDefaultEmitterDrive.driveMode === 'constantCurrent' && 'active',
                ]"
                type="button"
                @click="store.setBoardPlannerDefaultEmitterDriveMode('constantCurrent')"
              >
                Constant Current
              </button>
            </div>
          </label>
          <label class="mini-drive-field">
            <span>V</span>
            <input
              :value="store.boardPlannerDefaultEmitterDrive.voltageV"
              type="number"
              min="0"
              step="0.01"
              class="mini-drive-input"
              @input="store.updateBoardPlannerDefaultEmitterDrive('voltageV', $event.target.value)"
            />
          </label>
          <label class="mini-drive-field">
            <span>A</span>
            <input
              :value="store.boardPlannerDefaultEmitterDrive.currentA"
              type="number"
              min="0"
              step="0.01"
              class="mini-drive-input"
              @input="store.updateBoardPlannerDefaultEmitterDrive('currentA', $event.target.value)"
            />
          </label>
          <label class="mini-drive-field">
            <span>°C</span>
            <input
              :value="store.boardPlannerDefaultEmitterDrive.temperatureC"
              type="number"
              min="-20"
              step="0.5"
              class="mini-drive-input"
              @input="store.updateBoardPlannerDefaultEmitterDrive('temperatureC', $event.target.value)"
            />
          </label>
        </div>
      </div>
      <div class="control-group">
        <h3 class="control-group-title">Board Geometry</h3>
        <div class="mini-drive-row">
          <label class="mini-drive-field">
            <span>Width (mm)</span>
            <input v-model.number="store.form.widthMm" type="number" min="10" step="1" class="mini-drive-input" />
          </label>
          <label class="mini-drive-field">
            <span>Depth (mm)</span>
            <input v-model.number="store.form.depthMm" type="number" min="10" step="1" class="mini-drive-input" />
          </label>
          <label class="mini-drive-field">
            <span>LED Count</span>
            <input v-model.number="store.form.ledCount" type="number" min="1" step="1" class="mini-drive-input" />
          </label>
          <label class="mini-drive-field">
            <span>Columns</span>
            <input v-model.number="store.form.columns" type="number" min="1" step="1" class="mini-drive-input" />
          </label>
          <label class="mini-drive-field">
            <span>Rows</span>
            <input v-model.number="store.form.rows" type="number" min="1" step="1" class="mini-drive-input" />
          </label>
          <label class="mini-drive-field">
            <span>Spacing X (mm)</span>
            <input v-model.number="store.form.spacingXMm" type="number" min="0.5" step="0.5" class="mini-drive-input" />
          </label>
          <label class="mini-drive-field">
            <span>Spacing Y (mm)</span>
            <input v-model.number="store.form.spacingYMm" type="number" min="0.5" step="0.5" class="mini-drive-input" />
          </label>
        </div>
      </div>
      <div class="control-group">
        <h3 class="control-group-title">Wiring</h3>
        <div class="mini-drive-row">
          <label class="mini-drive-field">
            <span>Parallel Strings</span>
            <input
              v-model.number="store.form.parallelCount"
              type="number"
              min="1"
              step="1"
              class="mini-drive-input"
              title="Parallel Strings"
            />
          </label>
          <label class="mini-drive-field">
            <span>Series per String</span>
            <input
              v-model.number="store.form.seriesCount"
              type="number"
              min="1"
              step="1"
              class="mini-drive-input"
              title="Series LEDs per String"
            />
          </label>
        </div>
      </div>
    </div>

    <div class="board-preview-shell">
      <svg :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`" class="board-preview-svg" role="img" aria-label="Board preview">
        <rect
          :x="boardRect.x"
          :y="boardRect.y"
          :width="boardRect.width"
          :height="boardRect.height"
          rx="12"
          class="board-preview-rect"
        />
        <g
          v-for="emitter in preview.emitters"
          :key="emitter.id"
          class="emitter-node"
          @click="store.selectBoardPlannerEmitter(emitter.id)"
        >
          <circle
            :cx="emitterPosition(emitter).x"
            :cy="emitterPosition(emitter).y"
            :r="store.selectedBoardPlannerEmitterId === emitter.id ? 7 : 5"
            :class="emitterClassName(emitter)"
            @pointerdown="emitterDragController.handlePointerDown($event, emitter.id)"
            @pointermove="emitterDragController.handlePointerMove($event, emitter.id)"
            @pointerup="emitterDragController.handlePointerUp($event, emitter.id)"
            @pointercancel="emitterDragController.handlePointerCancel()"
          />
        </g>
      </svg>
    </div>

    <div class="dli-table">
      <div class="dli-table__header">
        <span class="stat-label">Board Spectrum Summary</span>
        <span class="mono">CCT: {{ preview.cctK ?? "n/a" }}</span>
      </div>
      <div class="dli-table__grid">
        <div class="dli-table__row">
          <span class="dli-table__label">Estimated Board Voltage</span>
          <span class="dli-table__value">{{ preview.boardElectricalEstimate.boardVoltageV.toFixed(2) }} V</span>
        </div>
        <div class="dli-table__row">
          <span class="dli-table__label">Estimated Board Current</span>
          <span class="dli-table__value">{{ preview.boardElectricalEstimate.boardCurrentA.toFixed(2) }} A</span>
        </div>
        <div class="dli-table__row">
          <span class="dli-table__label">Estimated Board Power</span>
          <span class="dli-table__value">{{ preview.boardElectricalEstimate.inputPowerW.toFixed(2) }} W</span>
        </div>
        <div class="dli-table__row">
          <span class="dli-table__label">Wiring</span>
          <span class="dli-table__value">
            {{ preview.boardElectricalEstimate.seriesCount }}S / {{ preview.boardElectricalEstimate.parallelCount }}P
          </span>
        </div>
        <div class="dli-table__row">
          <span class="dli-table__label">PAR / total</span>
          <span class="dli-table__value">{{ preview.spectralStats.parRatio.toFixed(3) }}</span>
        </div>
        <div class="dli-table__row">
          <span class="dli-table__label">PBAR / total</span>
          <span class="dli-table__value">{{ preview.spectralStats.pbarRatio.toFixed(3) }}</span>
        </div>
        <div class="dli-table__row">
          <span class="dli-table__label">McCree / total</span>
          <span class="dli-table__value">{{ preview.spectralStats.mccreeRatio.toFixed(3) }}</span>
        </div>
        <div class="dli-table__row">
          <span class="dli-table__label">DIN / total</span>
          <span class="dli-table__value">{{ preview.spectralStats.dinRatio.toFixed(3) }}</span>
        </div>
      </div>
    </div>

    <div class="dli-table" style="margin-top: 14px">
      <div class="dli-table__header">
        <span class="stat-label">Board Spectrum</span>
        <span class="mono">280–840 nm</span>
      </div>
      <div class="field-grid two-columns" style="margin-top: 10px">
        <label class="field">
          <span>SPD Mode</span>
          <div class="segmented">
            <button
              class="segmented__btn"
              :class="{ active: store.boardPlannerSpectrumMode === 'relative' }"
              type="button"
              @click="store.setBoardPlannerSpectrumMode('relative')"
            >
              Relative
            </button>
            <button
              class="segmented__btn"
              :class="{ active: store.boardPlannerSpectrumMode === 'photon' }"
              type="button"
              @click="store.setBoardPlannerSpectrumMode('photon')"
            >
              Photon
            </button>
          </div>
        </label>
      </div>

      <div class="spectrum-chart">
        <svg :viewBox="`0 0 900 260`" role="img" aria-label="Board spectral chart">
          <rect x="0" y="0" width="900" height="260" rx="16" fill="rgba(255,255,255,0.03)" />
          <g stroke="rgba(255,255,255,0.10)" stroke-width="1">
            <line x1="60" y1="40" x2="60" y2="220" />
            <line x1="210" y1="40" x2="210" y2="220" />
            <line x1="360" y1="40" x2="360" y2="220" />
            <line x1="510" y1="40" x2="510" y2="220" />
            <line x1="660" y1="40" x2="660" y2="220" />
            <line x1="810" y1="40" x2="810" y2="220" />
            <line
              v-for="tick in boardSpectrumChart.yTicks"
              :key="`board-grid-y-${tick.value}`"
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
            <text x="14" y="20">{{ store.boardPlannerSpectrumMode === "relative" ? "Relative SPD" : "Photon SPD (µmol/s/nm)" }}</text>
            <text v-for="tick in boardSpectrumChart.yTicks" :key="`board-tick-label-${tick.value}`" x="28" :y="tick.y + 4">
              {{ tick.label }}
            </text>
          </g>
          <g fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path :d="boardSpectrumChart.seriesPath(boardSpectrumSeries)" stroke="#56e1ff" stroke-width="2.5" opacity="0.95" />
          </g>
        </svg>
      </div>
    </div>
  </details>
</template>

<style scoped>
.board-preview-shell {
  border: 1px solid rgba(147, 197, 253, 0.12);
  border-radius: 16px;
  background: rgba(8, 12, 21, 0.95);
  padding: 8px;
  margin-bottom: 14px;
}

.board-preview-svg {
  width: 100%;
  display: block;
}

.board-preview-rect {
  fill: rgba(86, 225, 255, 0.12);
  stroke: rgba(86, 225, 255, 0.55);
  stroke-width: 2;
}

.emitter-node {
  cursor: pointer;
}

.emitter-circle {
  fill: rgba(217, 255, 112, 0.85);
  stroke: rgba(10, 18, 30, 0.85);
  stroke-width: 1.5;
}

.emitter-circle.selected {
  fill: rgba(255, 170, 60, 0.95);
  stroke: rgba(255, 234, 138, 0.95);
  stroke-width: 2;
}

.emitter-circle.override {
  fill: rgba(255, 78, 78, 0.92);
  stroke: rgba(255, 178, 178, 0.95);
  stroke-width: 1.8;
}

.emitter-circle.selected.override {
  fill: rgba(255, 110, 110, 1);
  stroke: rgba(255, 220, 220, 1);
  stroke-width: 2.2;
}

.mini-drive-row {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.mini-drive-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(186, 206, 230, 0.9);
  font-size: 0.78rem;
  flex-direction: column;
  align-items: flex-start;
}

.mini-drive-input {
  width: 88px;
  background: rgba(10, 20, 34, 0.9);
  border: 1px solid rgba(147, 197, 253, 0.2);
  color: rgba(226, 232, 240, 0.95);
  border-radius: 10px;
  padding: 7px 9px;
}

.led-select-field {
  margin-left: 6px;
}

.led-select-input {
  width: 280px;
}

.mode-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 38px;
  padding: 0 12px;
  line-height: 1;
  vertical-align: middle;
  border: 1px solid rgba(147, 197, 253, 0.28);
  background: rgba(10, 20, 34, 0.88);
  color: rgba(226, 232, 240, 0.92);
}

.mode-pill.active {
  border-color: rgba(163, 230, 53, 0.92);
  background: rgba(163, 230, 53, 0.2);
  color: rgba(219, 255, 125, 1);
  box-shadow: 0 0 0 1px rgba(163, 230, 53, 0.3) inset;
}

.mode-button-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
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

.preview-controls-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.control-group {
  border: 1px solid rgba(147, 197, 253, 0.14);
  border-radius: 12px;
  padding: 10px;
  background: rgba(7, 13, 24, 0.65);
}

.control-group-title {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: rgba(192, 211, 232, 0.95);
}

@media (max-width: 1400px) {
  .preview-controls-grid {
    grid-template-columns: 1fr;
  }
}
</style>
