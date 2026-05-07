// Datasheet-backed LED model for PPFD/PPF calculations.
// Scope: Samsung LM301H CRI70, LM301H CRI80, LM301H CRI90, LM301H EVO.
// Notes:
// - LEDs emit PPF (umol/s). PPFD (umol/m2/s) is produced later by the geometry/heatmap model.
// - Curves below are approximate point samples digitized from datasheet graphs, not guaranteed test-lab data.

import type {
  LedAbsoluteMaximum,
  LedCurveSet,
  LedDeratingCurveSet,
} from "@/domain/contracts";

export const ABSOLUTE_MAXIMUM_COMMON: LedAbsoluteMaximum = {
  ambientOperatingTempC: { min: -40, max: 85 },
  storageTempC: { min: -40, max: 120 },
  junctionTempCMax: 110,
  forwardCurrentMAMax: 200,
  pulseForwardCurrentMAMax: 300,
  pulseCondition: "duty 1/10, pulse width 10 ms",
  esdHbmKV: 5,
};
export const VOLTAGE_BINS: Record<
  string,
  { minV: number; maxV: number; typicalV: number }
> = {
  XA: { minV: 2.6, maxV: 2.9, typicalV: 2.7 },
  AY: { minV: 2.6, maxV: 2.7, typicalV: 2.65 },
  AZ: { minV: 2.7, maxV: 2.8, typicalV: 2.75 },
  A1: { minV: 2.8, maxV: 2.9, typicalV: 2.85 },
};
export const LUMINOUS_FLUX_BINS_LM: Record<
  string,
  { minLm: number; maxLm: number; typicalLm: number }
> = {
  SF: { minLm: 28, maxLm: 30, typicalLm: 29 },
  SG: { minLm: 30, maxLm: 32, typicalLm: 31 },
  SH: { minLm: 32, maxLm: 34, typicalLm: 33 },
  SJ: { minLm: 34, maxLm: 36, typicalLm: 35 },
  SK: { minLm: 36, maxLm: 38, typicalLm: 37 },
  SL: { minLm: 38, maxLm: 40, typicalLm: 39 },
  SM: { minLm: 40, maxLm: 42, typicalLm: 41 },
};
export const LED_CURVES: Record<string, LedCurveSet> = {
  lm301hStandard: {
    // Inverted when you want voltage from a known current.
    forwardCurrentMAByForwardVoltageV: {
      xUnit: "V",
      yUnit: "mA",
      source:
        "LM301H CRI70/CRI80/CRI90 datasheet graph: Forward Current vs. Forward Voltage, Ts = 25 C",
      notes:
        "Approximate points digitized from the graph. Use voltage bins for worst-case calculations.",
      points: [
        [2.6, 5],
        [2.65, 15],
        [2.7, 34],
        [2.75, 58],
        [2.8, 88],
        [2.85, 125],
        [2.9, 168],
        [2.94, 200],
      ],
    },
    // Old model used tempCoefficient. This curve is better because it is not forced to be linear.
    // For non-EVO PDFs the graph label says "Relative Luminous Flux"; for PPFD/PPF work we use it
    // as a practical relative PPF proxy unless a spectral-current correction is available.
    relativePpfByCurrentMA: {
      xUnit: "mA",
      yUnit: "%",
      normalizedAt: { x: 65, y: 100 },
      source:
        "LM301H CRI70/CRI80/CRI90 datasheet graph: Relative Luminous Flux vs. Forward Current, Ts = 25 C",
      notes:
        "Approximate; luminous-flux-relative curve used as relative PPF proxy.",
      points: [
        [0, 0],
        [20, 31],
        [40, 62],
        [65, 100],
        [100, 150],
        [150, 220],
        [200, 285],
      ],
    },
    relativePpfBySolderPointTempC: {
      xUnit: "C",
      yUnit: "%",
      normalizedAt: { x: 25, y: 100 },
      source:
        "LM301H CRI70/CRI80/CRI90 datasheet graph: Relative Luminous Flux vs. Temperature, IF = 65 mA",
      notes:
        "Approximate; luminous-flux-relative curve used as relative PPF proxy.",
      points: [
        [25, 100],
        [45, 98],
        [65, 96],
        [85, 94],
      ],
    },
    relativeForwardVoltageBySolderPointTempC: {
      xUnit: "C",
      yUnit: "%",
      normalizedAt: { x: 25, y: 100 },
      source:
        "LM301H CRI70/CRI80/CRI90 datasheet graph: Relative Forward Voltage vs. Temperature, IF = 65 mA",
      notes: "Approximate.",
      points: [
        [25, 100],
        [45, 99],
        [65, 98],
        [85, 97],
      ],
    },
  },
  lm301hEvo: {
    forwardCurrentMAByForwardVoltageV: {
      xUnit: "V",
      yUnit: "mA",
      source:
        "LM301H EVO datasheet graph: Forward Current vs. Forward Voltage, Ts = 25 C",
      notes:
        "Approximate points digitized from the graph. Use voltage bins for worst-case calculations.",
      points: [
        [2.58, 3],
        [2.65, 12],
        [2.7, 30],
        [2.75, 55],
        [2.8, 88],
        [2.85, 128],
        [2.9, 174],
        [2.92, 200],
      ],
    },
    relativePpfByCurrentMA: {
      xUnit: "mA",
      yUnit: "%",
      normalizedAt: { x: 65, y: 100 },
      source:
        "LM301H EVO datasheet graph: Relative PPF vs. Forward Current, Ts = 25 C",
      notes: "Approximate.",
      points: [
        [0, 0],
        [20, 31],
        [40, 62],
        [65, 100],
        [100, 151],
        [150, 225],
        [200, 295],
      ],
    },
    relativePpfBySolderPointTempC: {
      xUnit: "C",
      yUnit: "%",
      normalizedAt: { x: 25, y: 100 },
      source:
        "LM301H EVO datasheet graph: Relative PPF vs. Temperature, IF = 65 mA",
      notes: "Approximate.",
      points: [
        [25, 100],
        [45, 98.5],
        [65, 96.5],
        [85, 94.5],
      ],
    },
    relativeForwardVoltageBySolderPointTempC: {
      xUnit: "C",
      yUnit: "%",
      normalizedAt: { x: 25, y: 100 },
      source:
        "LM301H EVO datasheet graph: Relative Forward Voltage vs. Temperature, IF = 65 mA",
      notes: "Approximate.",
      points: [
        [25, 100],
        [45, 98.5],
        [65, 97.2],
        [85, 96.4],
      ],
    },
  },
};
export const DERATING_CURVES: Record<string, LedDeratingCurveSet> = {
  lm301hStandard: {
    xUnit: "ambientTempC",
    yUnit: "maxForwardCurrentMA",
    source:
      "LM301H CRI70/CRI80/CRI90 datasheet derating graph; standard LM301H pages show Rth(j-a) = 40, 60, 80, 100 C/W",
    notes:
      "Approximate points digitized from graph images. The curve limits maximum IF based on ambient temperature and board-level Rth(j-a); it is not a light-output derating multiplier. Do not confuse this with package Rth(j-s) = 7.5 C/W.",
    curves: [
      {
        thermalResistanceJunctionToAmbientCW: 40,
        points: [
          [0, 200],
          [85, 200],
        ],
      },
      {
        thermalResistanceJunctionToAmbientCW: 60,
        points: [
          [0, 200],
          [75, 200],
          [85, 150],
        ],
      },
      {
        thermalResistanceJunctionToAmbientCW: 80,
        points: [
          [0, 200],
          [65, 200],
          [85, 115],
        ],
      },
      {
        thermalResistanceJunctionToAmbientCW: 100,
        points: [
          [0, 200],
          [55, 200],
          [85, 90],
        ],
      },
    ],
  },
  lm301hEvo: {
    xUnit: "ambientTempC",
    yUnit: "maxForwardCurrentMA",
    source:
      "LM301H EVO datasheet derating graph; EVO page shows Rth(j-a) = 25, 50, 75, 100 C/W",
    notes:
      "Approximate points digitized from graph images. The curve limits maximum IF based on ambient temperature and board-level Rth(j-a); it is not a light-output derating multiplier. Do not confuse this with package Rth(j-s) = 7.5 C/W.",
    curves: [
      {
        thermalResistanceJunctionToAmbientCW: 25,
        points: [
          [0, 200],
          [85, 200],
        ],
      },
      {
        thermalResistanceJunctionToAmbientCW: 50,
        points: [
          [0, 200],
          [80, 200],
          [85, 165],
        ],
      },
      {
        thermalResistanceJunctionToAmbientCW: 75,
        points: [
          [0, 200],
          [65, 200],
          [85, 115],
        ],
      },
      {
        thermalResistanceJunctionToAmbientCW: 100,
        points: [
          [0, 200],
          [55, 200],
          [85, 90],
        ],
      },
    ],
  },
};
