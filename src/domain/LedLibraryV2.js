// LedLibraryV2.js
// Datasheet-backed LED model for PPFD/PPF calculations.
// Scope: Samsung LM301H CRI70, LM301H CRI80, LM301H CRI90, LM301H EVO.
// Notes:
// - LEDs emit PPF (umol/s). PPFD (umol/m2/s) is produced later by the geometry/heatmap model.
// - Curves below are approximate point samples digitized from datasheet graphs, not guaranteed test-lab data.
// - Keep the old field names only as migration comments, not as primary model names.
export const ABSOLUTE_MAXIMUM_COMMON = {
  ambientOperatingTempC: {min: -40, max: 85},
  storageTempC: {min: -40, max: 120},
  junctionTempCMax: 110,
  forwardCurrentMAMax: 200,
  pulseForwardCurrentMAMax: 300,
  pulseCondition: "duty 1/10, pulse width 10 ms",
  esdHbmKV: 5,
};
export const VOLTAGE_BINS = {
  XA: {minV: 2.6, maxV: 2.9, typicalV: 2.7},
  AY: {minV: 2.6, maxV: 2.7, typicalV: 2.65},
  AZ: {minV: 2.7, maxV: 2.8, typicalV: 2.75},
  A1: {minV: 2.8, maxV: 2.9, typicalV: 2.85},
};
export const LUMINOUS_FLUX_BINS_LM = {
  SF: {minLm: 28, maxLm: 30, typicalLm: 29},
  SG: {minLm: 30, maxLm: 32, typicalLm: 31},
  SH: {minLm: 32, maxLm: 34, typicalLm: 33},
  SJ: {minLm: 34, maxLm: 36, typicalLm: 35},
  SK: {minLm: 36, maxLm: 38, typicalLm: 37},
  SL: {minLm: 38, maxLm: 40, typicalLm: 39},
  SM: {minLm: 40, maxLm: 42, typicalLm: 41},
};
export const LED_CURVES = {
  lm301hStandard: {
    // Inverted when you want voltage from a known current.
    forwardCurrentMAByForwardVoltageV: {
      xUnit: "V",
      yUnit: "mA",
      source: "LM301H CRI70/CRI80/CRI90 datasheet graph: Forward Current vs. Forward Voltage, Ts = 25 C",
      notes: "Approximate points digitized from the graph. Use voltage bins for worst-case calculations.",
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
      normalizedAt: {x: 65, y: 100},
      source: "LM301H CRI70/CRI80/CRI90 datasheet graph: Relative Luminous Flux vs. Forward Current, Ts = 25 C",
      notes: "Approximate; luminous-flux-relative curve used as relative PPF proxy.",
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
      normalizedAt: {x: 25, y: 100},
      source: "LM301H CRI70/CRI80/CRI90 datasheet graph: Relative Luminous Flux vs. Temperature, IF = 65 mA",
      notes: "Approximate; luminous-flux-relative curve used as relative PPF proxy.",
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
      normalizedAt: {x: 25, y: 100},
      source: "LM301H CRI70/CRI80/CRI90 datasheet graph: Relative Forward Voltage vs. Temperature, IF = 65 mA",
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
      source: "LM301H EVO datasheet graph: Forward Current vs. Forward Voltage, Ts = 25 C",
      notes: "Approximate points digitized from the graph. Use voltage bins for worst-case calculations.",
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
      normalizedAt: {x: 65, y: 100},
      source: "LM301H EVO datasheet graph: Relative PPF vs. Forward Current, Ts = 25 C",
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
      normalizedAt: {x: 25, y: 100},
      source: "LM301H EVO datasheet graph: Relative PPF vs. Temperature, IF = 65 mA",
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
      normalizedAt: {x: 25, y: 100},
      source: "LM301H EVO datasheet graph: Relative Forward Voltage vs. Temperature, IF = 65 mA",
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
export const DERATING_CURVES = {
  lm301hStandard: {
    xUnit: "ambientTempC",
    yUnit: "maxForwardCurrentMA",
    source: "LM301H CRI70/CRI80/CRI90 datasheet derating graph; standard LM301H pages show Rth(j-a) = 40, 60, 80, 100 C/W",
    notes: "Approximate points digitized from graph images. The curve limits maximum IF based on ambient temperature and board-level Rth(j-a); it is not a light-output derating multiplier. Do not confuse this with package Rth(j-s) = 7.5 C/W.",
    curves: [
      {thermalResistanceJunctionToAmbientCW: 40, points: [[0, 200], [85, 200]]},
      {thermalResistanceJunctionToAmbientCW: 60, points: [[0, 200], [75, 200], [85, 150]]},
      {thermalResistanceJunctionToAmbientCW: 80, points: [[0, 200], [65, 200], [85, 115]]},
      {thermalResistanceJunctionToAmbientCW: 100, points: [[0, 200], [55, 200], [85, 90]]},
    ],
  },
  lm301hEvo: {
    xUnit: "ambientTempC",
    yUnit: "maxForwardCurrentMA",
    source: "LM301H EVO datasheet derating graph; EVO page shows Rth(j-a) = 25, 50, 75, 100 C/W",
    notes: "Approximate points digitized from graph images. The curve limits maximum IF based on ambient temperature and board-level Rth(j-a); it is not a light-output derating multiplier. Do not confuse this with package Rth(j-s) = 7.5 C/W.",
    curves: [
      {thermalResistanceJunctionToAmbientCW: 25, points: [[0, 200], [85, 200]]},
      {thermalResistanceJunctionToAmbientCW: 50, points: [[0, 200], [80, 200], [85, 165]]},
      {thermalResistanceJunctionToAmbientCW: 75, points: [[0, 200], [65, 200], [85, 115]]},
      {thermalResistanceJunctionToAmbientCW: 100, points: [[0, 200], [55, 200], [85, 90]]},
    ],
  },
};
export const LM301H_MACADAM_ELLIPSES = {
  Y5: {cctK: 2200, x: 0.5018, y: 0.4153, thetaDeg: -39.89, a: 0.00667, b: 0.01201},
  W5: {cctK: 2700, x: 0.4578, y: 0.4101, thetaDeg: 53.7, a: 0.0135, b: 0.007},
  V5: {cctK: 3000, x: 0.4338, y: 0.403, thetaDeg: 53.22, a: 0.0139, b: 0.0068},
  U5: {cctK: 3500, x: 0.4073, y: 0.3917, thetaDeg: 54.0, a: 0.01545, b: 0.0069},
  T5: {cctK: 4000, x: 0.3818, y: 0.3797, thetaDeg: 53.72, a: 0.01565, b: 0.0067},
  R5: {cctK: 5000, x: 0.3447, y: 0.3553, thetaDeg: 59.62, a: 0.0137, b: 0.0059},
  Q5: {cctK: 5700, x: 0.3287, y: 0.3417, thetaDeg: 59.09, a: 0.01243, b: 0.00533},
  P5: {cctK: 6500, x: 0.3123, y: 0.3282, thetaDeg: 58.57, a: 0.01115, b: 0.00475},
};
export const LM301H_EVO_CHROMATICITY_QUADS = {
  VW: {x1: 0.4221, y1: 0.3984, x2: 0.4299, y2: 0.4165, x3: 0.443, y3: 0.4212, x4: 0.4342, y4: 0.4028},
  VX: {x1: 0.4342, y1: 0.4028, x2: 0.443, y2: 0.4212, x3: 0.4562, y3: 0.426, x4: 0.4465, y4: 0.4071},
  VY: {x1: 0.4259, y1: 0.3853, x2: 0.4342, y2: 0.4028, x3: 0.4465, y3: 0.4071, x4: 0.4373, y4: 0.3893},
  VZ: {x1: 0.4147, y1: 0.3814, x2: 0.4221, y2: 0.3984, x3: 0.4342, y3: 0.4028, x4: 0.4259, y4: 0.3853},
  TW: {x1: 0.3702, y1: 0.3722, x2: 0.3825, y2: 0.3798, x3: 0.3869, y3: 0.3958, x4: 0.3736, y4: 0.3874},
  TX: {x1: 0.3825, y1: 0.3798, x2: 0.395, y2: 0.3875, x3: 0.4006, y3: 0.4044, x4: 0.3869, y4: 0.3958},
  TY: {x1: 0.3783, y1: 0.3646, x2: 0.3898, y2: 0.3716, x3: 0.395, y3: 0.3875, x4: 0.3825, y4: 0.3798},
  TZ: {x1: 0.367, y1: 0.3578, x2: 0.3783, y2: 0.3646, x3: 0.3825, y3: 0.3798, x4: 0.3702, y4: 0.3722},
  RW: {x1: 0.3376, y1: 0.3616, x2: 0.3463, y2: 0.3687, x3: 0.3451, y3: 0.3554, x4: 0.3371, y4: 0.349},
  RX: {x1: 0.3463, y1: 0.3687, x2: 0.3551, y2: 0.376, x3: 0.3533, y3: 0.362, x4: 0.3451, y4: 0.3554},
  RY: {x1: 0.3451, y1: 0.3554, x2: 0.3533, y2: 0.362, x3: 0.3515, y3: 0.3487, x4: 0.344, y4: 0.3427},
  RZ: {x1: 0.3371, y1: 0.349, x2: 0.3451, y2: 0.3554, x3: 0.344, y3: 0.3427, x4: 0.3366, y4: 0.3369},
  PW: {x1: 0.3048, y1: 0.3207, x2: 0.313, y2: 0.329, x3: 0.3115, y3: 0.3391, x4: 0.3028, y4: 0.3304},
  PX: {x1: 0.313, y1: 0.329, x2: 0.3213, y2: 0.3373, x3: 0.3205, y3: 0.3481, x4: 0.3115, y4: 0.3391},
  PY: {x1: 0.3144, y1: 0.3186, x2: 0.3221, y2: 0.3261, x3: 0.3213, y3: 0.3373, x4: 0.313, y4: 0.329},
  PZ: {x1: 0.3068, y1: 0.3113, x2: 0.3144, y2: 0.3186, x3: 0.313, y3: 0.329, x4: 0.3048, y4: 0.3207},
  M1: {x1: 0.3064, y1: 0.4403, x2: 0.3236, y2: 0.4337, x3: 0.3104, y3: 0.3994, x4: 0.2933, y4: 0.406},
  M2: {x1: 0.2933, y1: 0.406, x2: 0.3104, y2: 0.3994, x3: 0.2973, y3: 0.3651, x4: 0.2801, y4: 0.3717},
  M3: {x1: 0.2801, y1: 0.3717, x2: 0.2973, y2: 0.3651, x3: 0.2841, y3: 0.3307, x4: 0.2669, y4: 0.3373},
  M4: {x1: 0.2669, y1: 0.3373, x2: 0.2841, y2: 0.3307, x3: 0.2709, y3: 0.2964, x4: 0.2538, y4: 0.303},
};

function lmBinRecord(codes) {
  const result = {};
  for (const code of codes)
    result[code] = LUMINOUS_FLUX_BINS_LM[code];
  return result;
}

function ppfBin(minPpfUmolS, maxPpfUmolS) {
  return {
    minPpfUmolS,
    maxPpfUmolS,
    typicalPpfUmolS: (minPpfUmolS + maxPpfUmolS) / 2,
  };
}

const COMMON_REFERENCE = {
  currentMA: 65,
  solderPointTempC: 25,
  forwardVoltageV: 2.7,
};
const COMMON_STANDARD = {
  manufacturer: "Samsung",
  family: "LM301H",
  package: "3030",
  packageSizeMm: [3, 3, 0.7],
  curveSetId: "lm301hStandard",
  absoluteMaximum: ABSOLUTE_MAXIMUM_COMMON,
  thermalResistanceJunctionToSolderPointCW: 7.5,
  beamAngleDeg: 120,
  voltageBins: VOLTAGE_BINS,
  deratingCurves: DERATING_CURVES.lm301hStandard,
  systemEfficiency: 1.0,
};
const COMMON_EVO = {
  manufacturer: "Samsung",
  family: "LM301H EVO",
  package: "3030",
  packageSizeMm: [3, 3, 0.8],
  curveSetId: "lm301hEvo",
  absoluteMaximum: ABSOLUTE_MAXIMUM_COMMON,
  thermalResistanceJunctionToSolderPointCW: 7.5,
  beamAngleDeg: 120,
  voltageBins: VOLTAGE_BINS,
  deratingCurves: DERATING_CURVES.lm301hEvo,
  systemEfficiency: 1.0,
};

function noPpfReference(note) {
  return {...COMMON_REFERENCE, source: "notProvided", note};
}

function datasheetPpfPpe(ppfUmolS, ppeUmolJ) {
  return {
    ...COMMON_REFERENCE,
    ppfUmolS,
    ppeUmolJ,
    source: "datasheet",
    note: "Datasheet PPF/PPE table; Samsung marks PPF/PPE as calculated, reference only.",
  };
}

function evoBinReference(minPpfUmolS, maxPpfUmolS) {
  const bin = ppfBin(minPpfUmolS, maxPpfUmolS);
  return {
    ...COMMON_REFERENCE,
    ppfUmolS: bin.typicalPpfUmolS,
    ppfRangeUmolS: bin,
    ppeUmolJ: bin.typicalPpfUmolS / (0.065 * 2.7),
    source: "datasheetBinMidpoint",
    note: "Datasheet gives PPF min/max bins, not a single typical. ppfUmolS is the bin midpoint.",
  };
}

const HOMEPAGE_LM301H_5000K_CRI80 = {
  currentMA: 65,
  solderPointTempC: 25,
  cctK: 5000,
  cri: 80,
  forwardVoltageV: 2.7,
  nominalWattageW: 0.2,
  ppfUmolS: 0.56,
  ppeUmolJ: 3.1,
  note: "User-provided Samsung homepage tech spec. Wattage appears nominal/rounded; compute electrical power from V * A for calculations.",
};
const HOMEPAGE_LM301H_EVO_5000K_CRI80 = {
  currentMA: 65,
  solderPointTempC: 25,
  cctK: 5000,
  cri: 80,
  forwardVoltageV: 2.7,
  nominalWattageW: 0.2,
  ppfUmolS: 0.56,
  ppeUmolJ: 3.14,
  note: "User-provided Samsung homepage tech spec. Wattage appears nominal/rounded; compute electrical power from V * A for calculations.",
};
export const LED_LIBRARY_V2 = {
  lm301h_cri70_3000k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri70_3000k",
    name: "Samsung LM301H 3000K CRI70",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 40,
      source: "User-provided (datasheet typical test condition for spectrum, CRI70).",
    },
    criMin: 70,
    cctK: 3000,
    colorCode: "V",
    productCodeTemplate: "SPMWHD32AMH3XAV{0|5}S0",
    luminousFluxBinCodes: ["SJ", "SK", "SL"],
    luminousFluxBinsLm: lmBinRecord(["SJ", "SK", "SL"]),
    chromaticityRank: "V0/V5",
    chromaticityBins: ["VE", "VF", "VG", "VH", "VJ", "VK", "VL", "VM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.V5,
    reference: noPpfReference("CRI70 datasheet provides luminous-flux bins and spectra, but no PPF/PPE table."),
    sourceDocuments: ["Data_Sheet_LM301H_CRI70_Rev.2.2.pdf"],
  },
  lm301h_cri70_3500k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri70_3500k",
    name: "Samsung LM301H 3500K CRI70",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 40,
      source: "User-provided (datasheet typical test condition for spectrum, CRI70).",
    },
    criMin: 70,
    cctK: 3500,
    colorCode: "U",
    productCodeTemplate: "SPMWHD32AMH3XAU{0|5}S0",
    luminousFluxBinCodes: ["SJ", "SK", "SL"],
    luminousFluxBinsLm: lmBinRecord(["SJ", "SK", "SL"]),
    chromaticityRank: "U0/U5",
    chromaticityBins: ["UE", "UF", "UG", "UH", "UJ", "UK", "UL", "UM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.U5,
    reference: noPpfReference("CRI70 datasheet provides luminous-flux bins and spectra, but no PPF/PPE table."),
    sourceDocuments: ["Data_Sheet_LM301H_CRI70_Rev.2.2.pdf"],
  },
  lm301h_cri70_4000k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri70_4000k",
    name: "Samsung LM301H 4000K CRI70",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 42,
      source: "User-provided (datasheet typical test condition for spectrum, CRI70).",
    },
    criMin: 70,
    cctK: 4000,
    colorCode: "T",
    productCodeTemplate: "SPMWHD32AMH3XAT{0|5}S0",
    luminousFluxBinCodes: ["SK", "SL", "SM"],
    luminousFluxBinsLm: lmBinRecord(["SK", "SL", "SM"]),
    chromaticityRank: "T0/T5",
    chromaticityBins: ["TE", "TF", "TG", "TH", "TJ", "TK", "TL", "TM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.T5,
    reference: noPpfReference("CRI70 datasheet provides luminous-flux bins and spectra, but no PPF/PPE table."),
    sourceDocuments: ["Data_Sheet_LM301H_CRI70_Rev.2.2.pdf"],
  },
  lm301h_cri70_5000k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri70_5000k",
    name: "Samsung LM301H 5000K CRI70",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 42,
      source: "User-provided (datasheet typical test condition for spectrum, CRI70).",
    },
    criMin: 70,
    cctK: 5000,
    colorCode: "R",
    productCodeTemplate: "SPMWHD32AMH3XAR{0|5}S0",
    luminousFluxBinCodes: ["SK", "SL", "SM"],
    luminousFluxBinsLm: lmBinRecord(["SK", "SL", "SM"]),
    chromaticityRank: "R0/R5",
    chromaticityBins: ["RE", "RF", "RG", "RH", "RJ", "RK", "RL", "RM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.R5,
    reference: noPpfReference("CRI70 datasheet provides luminous-flux bins and spectra, but no PPF/PPE table."),
    sourceDocuments: ["Data_Sheet_LM301H_CRI70_Rev.2.2.pdf"],
  },
  lm301h_cri70_5700k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri70_5700k",
    name: "Samsung LM301H 5700K CRI70",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 42,
      source: "User-provided (datasheet typical test condition for spectrum, CRI70).",
    },
    criMin: 70,
    cctK: 5700,
    colorCode: "Q",
    productCodeTemplate: "SPMWHD32AMH3XAQ{0|5}S0",
    luminousFluxBinCodes: ["SK", "SL", "SM"],
    luminousFluxBinsLm: lmBinRecord(["SK", "SL", "SM"]),
    chromaticityRank: "Q0/Q5",
    chromaticityBins: ["QE", "QF", "QG", "QH", "QJ", "QK", "QL", "QM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.Q5,
    reference: noPpfReference("CRI70 datasheet provides luminous-flux bins and spectra, but no PPF/PPE table."),
    sourceDocuments: ["Data_Sheet_LM301H_CRI70_Rev.2.2.pdf"],
  },
  lm301h_cri80_2200k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri80_2200k",
    name: "Samsung LM301H 2200K CRI80",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 34,
      source: "User-provided (datasheet typical test condition for spectrum, CRI80).",
    },
    criMin: 80,
    cctK: 2200,
    colorCode: "Y",
    productCodeTemplate: "SPMWHD32AMH5XAY{0|5}S{0|G}",
    luminousFluxBinCodes: ["SF", "SG", "SH"],
    luminousFluxBinsLm: lmBinRecord(["SF", "SG", "SH"]),
    chromaticityRank: "Y0/Y5",
    chromaticityBins: ["YE", "YF", "YG", "YH", "YJ", "YK", "YL", "YM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.Y5,
    reference: noPpfReference("CRI80 datasheet PPF/PPE table starts at 2700K; 2200K has luminous-flux bins but no PPF/PPE value."),
    sourceDocuments: ["Data_Sheet_LM301H_CRI80_Rev.5.4.pdf"],
  },
  lm301h_cri80_2700k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri80_2700k",
    name: "Samsung LM301H 2700K CRI80",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 38,
      source: "User-provided (datasheet typical test condition for spectrum, CRI80).",
    },
    criMin: 80,
    cctK: 2700,
    colorCode: "W",
    productCodeTemplate: "SPMWHD32AMH5XAW{0|5}S{0|J}",
    luminousFluxBinCodes: ["SH", "SJ", "SK"],
    luminousFluxBinsLm: lmBinRecord(["SH", "SJ", "SK"]),
    chromaticityRank: "W0/W5",
    chromaticityBins: ["WE", "WF", "WG", "WH", "WJ", "WK", "WL", "WM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.W5,
    reference: datasheetPpfPpe(0.5, 2.83),
    sourceDocuments: ["Data_Sheet_LM301H_CRI80_Rev.5.4.pdf"],
  },
  lm301h_cri80_3000k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri80_3000k",
    name: "Samsung LM301H 3000K CRI80",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 40,
      source: "User-provided (datasheet typical test condition for spectrum, CRI80).",
    },
    criMin: 80,
    cctK: 3000,
    colorCode: "V",
    productCodeTemplate: "SPMWHD32AMH5XAV{0|5}S{0|K}",
    luminousFluxBinCodes: ["SJ", "SK", "SL"],
    luminousFluxBinsLm: lmBinRecord(["SJ", "SK", "SL"]),
    chromaticityRank: "V0/V5",
    chromaticityBins: ["VE", "VF", "VG", "VH", "VJ", "VK", "VL", "VM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.V5,
    reference: datasheetPpfPpe(0.511, 2.89),
    sourceDocuments: ["Data_Sheet_LM301H_CRI80_Rev.5.4.pdf"],
  },
  lm301h_cri80_3500k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri80_3500k",
    name: "Samsung LM301H 3500K CRI80",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 40,
      source: "User-provided (datasheet typical test condition for spectrum, CRI80).",
    },
    criMin: 80,
    cctK: 3500,
    colorCode: "U",
    productCodeTemplate: "SPMWHD32AMH5XAU{0|5}S{0|L}",
    luminousFluxBinCodes: ["SJ", "SK", "SL"],
    luminousFluxBinsLm: lmBinRecord(["SJ", "SK", "SL"]),
    chromaticityRank: "U0/U5",
    chromaticityBins: ["UE", "UF", "UG", "UH", "UJ", "UK", "UL", "UM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.U5,
    reference: datasheetPpfPpe(0.517, 2.92),
    sourceDocuments: ["Data_Sheet_LM301H_CRI80_Rev.5.4.pdf"],
  },
  lm301h_cri80_4000k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri80_4000k",
    name: "Samsung LM301H 4000K CRI80",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 40,
      source: "User-provided (datasheet typical test condition for spectrum, CRI80).",
    },
    criMin: 80,
    cctK: 4000,
    colorCode: "T",
    productCodeTemplate: "SPMWHD32AMH5XAT{0|5}S{0|L}",
    luminousFluxBinCodes: ["SK", "SL"],
    luminousFluxBinsLm: lmBinRecord(["SK", "SL"]),
    chromaticityRank: "T0/T5",
    chromaticityBins: ["TE", "TF", "TG", "TH", "TJ", "TK", "TL", "TM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.T5,
    reference: datasheetPpfPpe(0.528, 2.98),
    sourceDocuments: ["Data_Sheet_LM301H_CRI80_Rev.5.4.pdf"],
  },
  lm301h_cri80_5000k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri80_5000k",
    name: "Samsung LM301H 5000K CRI80",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 42,
      source: "User-provided (datasheet typical test condition for spectrum, CRI80).",
    },
    criMin: 80,
    cctK: 5000,
    colorCode: "R",
    productCodeTemplate: "SPMWHD32AMH5XAR{0|5}S{0|L|2}",
    luminousFluxBinCodes: ["SK", "SL", "SM"],
    luminousFluxBinsLm: lmBinRecord(["SK", "SL", "SM"]),
    chromaticityRank: "R0/R5",
    chromaticityBins: ["RE", "RF", "RG", "RH", "RJ", "RK", "RL", "RM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.R5,
    reference: datasheetPpfPpe(0.544, 3.08),
    manufacturerHomepageTypical: HOMEPAGE_LM301H_5000K_CRI80,
    sourceDocuments: ["Data_Sheet_LM301H_CRI80_Rev.5.4.pdf", "Samsung homepage tech spec supplied by user"],
  },
  lm301h_cri80_5700k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri80_5700k",
    name: "Samsung LM301H 5700K CRI80",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 40,
      source: "User-provided (datasheet typical test condition for spectrum, CRI80).",
    },
    criMin: 80,
    cctK: 5700,
    colorCode: "Q",
    productCodeTemplate: "SPMWHD32AMH5XAQ{0|5}S{0|L}",
    luminousFluxBinCodes: ["SK", "SL"],
    luminousFluxBinsLm: lmBinRecord(["SK", "SL"]),
    chromaticityRank: "Q0/Q5",
    chromaticityBins: ["QE", "QF", "QG", "QH", "QJ", "QK", "QL", "QM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.Q5,
    reference: datasheetPpfPpe(0.542, 3.07),
    sourceDocuments: ["Data_Sheet_LM301H_CRI80_Rev.5.4.pdf"],
  },
  lm301h_cri80_6500k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri80_6500k",
    name: "Samsung LM301H 6500K CRI80",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 40,
      source: "User-provided (datasheet typical test condition for spectrum, CRI80).",
    },
    criMin: 80,
    cctK: 6500,
    colorCode: "P",
    productCodeTemplate: "SPMWHD32AMH5XAP{0|5}S{0|L}",
    luminousFluxBinCodes: ["SK", "SL"],
    luminousFluxBinsLm: lmBinRecord(["SK", "SL"]),
    chromaticityRank: "P0/P5",
    chromaticityBins: ["PE", "PF", "PG", "PH", "PJ", "PK", "PL", "PM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.P5,
    reference: datasheetPpfPpe(0.541, 3.06),
    sourceDocuments: ["Data_Sheet_LM301H_CRI80_Rev.5.4.pdf"],
  },
  lm301h_cri90_2700k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri90_2700k",
    name: "Samsung LM301H 2700K CRI90",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 32,
      source: "User-provided (datasheet typical test condition for spectrum, CRI90).",
    },
    criMin: 90,
    cctK: 2700,
    colorCode: "W",
    productCodeTemplate: "SPMWHD32AMH7XAW{0|5}S0",
    luminousFluxBinCodes: ["SF", "SG"],
    luminousFluxBinsLm: lmBinRecord(["SF", "SG"]),
    chromaticityRank: "W0/W5",
    chromaticityBins: ["WE", "WF", "WG", "WH", "WJ", "WK", "WL", "WM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.W5,
    reference: noPpfReference("CRI90 datasheet provides luminous-flux bins and spectra, but no PPF/PPE table."),
    sourceDocuments: ["Data_Sheet_LM301H_CRI90_Rev.2.2.pdf"],
  },
  lm301h_cri90_3000k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri90_3000k",
    name: "Samsung LM301H 3000K CRI90",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 32,
      source: "User-provided (datasheet typical test condition for spectrum, CRI90).",
    },
    criMin: 90,
    cctK: 3000,
    colorCode: "V",
    productCodeTemplate: "SPMWHD32AMH7XAV{0|5}S0",
    luminousFluxBinCodes: ["SF", "SG"],
    luminousFluxBinsLm: lmBinRecord(["SF", "SG"]),
    chromaticityRank: "V0/V5",
    chromaticityBins: ["VE", "VF", "VG", "VH", "VJ", "VK", "VL", "VM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.V5,
    reference: noPpfReference("CRI90 datasheet provides luminous-flux bins and spectra, but no PPF/PPE table."),
    sourceDocuments: ["Data_Sheet_LM301H_CRI90_Rev.2.2.pdf"],
  },
  lm301h_cri90_3500k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri90_3500k",
    name: "Samsung LM301H 3500K CRI90",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 34,
      source: "User-provided (datasheet typical test condition for spectrum, CRI90).",
    },
    criMin: 90,
    cctK: 3500,
    colorCode: "U",
    productCodeTemplate: "SPMWHD32AMH7XAU{0|5}S0",
    luminousFluxBinCodes: ["SG", "SH"],
    luminousFluxBinsLm: lmBinRecord(["SG", "SH"]),
    chromaticityRank: "U0/U5",
    chromaticityBins: ["UE", "UF", "UG", "UH", "UJ", "UK", "UL", "UM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.U5,
    reference: noPpfReference("CRI90 datasheet provides luminous-flux bins and spectra, but no PPF/PPE table."),
    sourceDocuments: ["Data_Sheet_LM301H_CRI90_Rev.2.2.pdf"],
  },
  lm301h_cri90_4000k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri90_4000k",
    name: "Samsung LM301H 4000K CRI90",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 34,
      source: "User-provided (datasheet typical test condition for spectrum, CRI90).",
    },
    criMin: 90,
    cctK: 4000,
    colorCode: "T",
    productCodeTemplate: "SPMWHD32AMH7XAT{0|5}S0",
    luminousFluxBinCodes: ["SG", "SH"],
    luminousFluxBinsLm: lmBinRecord(["SG", "SH"]),
    chromaticityRank: "T0/T5",
    chromaticityBins: ["TE", "TF", "TG", "TH", "TJ", "TK", "TL", "TM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.T5,
    reference: noPpfReference("CRI90 datasheet provides luminous-flux bins and spectra, but no PPF/PPE table."),
    sourceDocuments: ["Data_Sheet_LM301H_CRI90_Rev.2.2.pdf"],
  },
  lm301h_cri90_5000k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri90_5000k",
    name: "Samsung LM301H 5000K CRI90",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 36,
      source: "User-provided (datasheet typical test condition for spectrum, CRI90).",
    },
    criMin: 90,
    cctK: 5000,
    colorCode: "R",
    productCodeTemplate: "SPMWHD32AMH7XAR{0|5}S0",
    luminousFluxBinCodes: ["SG", "SH", "SJ"],
    luminousFluxBinsLm: lmBinRecord(["SG", "SH", "SJ"]),
    chromaticityRank: "R0/R5",
    chromaticityBins: ["RE", "RF", "RG", "RH", "RJ", "RK", "RL", "RM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.R5,
    reference: noPpfReference("CRI90 datasheet provides luminous-flux bins and spectra, but no PPF/PPE table."),
    sourceDocuments: ["Data_Sheet_LM301H_CRI90_Rev.2.2.pdf"],
  },
  lm301h_cri90_5700k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri90_5700k",
    name: "Samsung LM301H 5700K CRI90",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 36,
      source: "User-provided (datasheet typical test condition for spectrum, CRI90).",
    },
    criMin: 90,
    cctK: 5700,
    colorCode: "Q",
    productCodeTemplate: "SPMWHD32AMH7XAQ{0|5}S0",
    luminousFluxBinCodes: ["SG", "SH", "SJ"],
    luminousFluxBinsLm: lmBinRecord(["SG", "SH", "SJ"]),
    chromaticityRank: "Q0/Q5",
    chromaticityBins: ["QE", "QF", "QG", "QH", "QJ", "QK", "QL", "QM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.Q5,
    reference: noPpfReference("CRI90 datasheet provides luminous-flux bins and spectra, but no PPF/PPE table."),
    sourceDocuments: ["Data_Sheet_LM301H_CRI90_Rev.2.2.pdf"],
  },
  lm301h_cri90_6500k: {
    ...COMMON_STANDARD,
    id: "lm301h_cri90_6500k",
    name: "Samsung LM301H 6500K CRI90",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      luminousFluxLm: 36,
      source: "User-provided (datasheet typical test condition for spectrum, CRI90).",
    },
    criMin: 90,
    cctK: 6500,
    colorCode: "P",
    productCodeTemplate: "SPMWHD32AMH7XAP{0|5}S0",
    luminousFluxBinCodes: ["SG", "SH", "SJ"],
    luminousFluxBinsLm: lmBinRecord(["SG", "SH", "SJ"]),
    chromaticityRank: "P0/P5",
    chromaticityBins: ["PE", "PF", "PG", "PH", "PJ", "PK", "PL", "PM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.P5,
    reference: noPpfReference("CRI90 datasheet provides luminous-flux bins and spectra, but no PPF/PPE table."),
    sourceDocuments: ["Data_Sheet_LM301H_CRI90_Rev.2.2.pdf"],
  },
  lm301h_evo_3000k: {
    ...COMMON_EVO,
    id: "lm301h_evo_3000k",
    name: "Samsung LM301H EVO 3000K",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      ppfUmolS: 0.557,
      source: "User-provided (datasheet typical test condition for spectrum, LM301H EVO).",
    },
    cctK: 3000,
    colorCode: "V0",
    productCodeTemplate: "SPMWHD32AMH0XAV0PV",
    ppfBin: ppfBin(0.494, 0.557),
    chromaticityRank: "V0",
    chromaticityBins: ["VE", "VF", "VG", "VH", "VJ", "VK", "VL", "VM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.V5,
    chromaticityQuads: {
      VW: LM301H_EVO_CHROMATICITY_QUADS.VW,
      VX: LM301H_EVO_CHROMATICITY_QUADS.VX,
      VY: LM301H_EVO_CHROMATICITY_QUADS.VY,
      VZ: LM301H_EVO_CHROMATICITY_QUADS.VZ,
    },
    reference: evoBinReference(0.494, 0.557),
    sourceDocuments: ["Data_Sheet_LM301H_EVO_Rev.2.1.pdf"],
  },
  lm301h_evo_4000k: {
    ...COMMON_EVO,
    id: "lm301h_evo_4000k",
    name: "Samsung LM301H EVO 4000K",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      ppfUmolS: 0.572,
      source: "User-provided (datasheet typical test condition for spectrum, LM301H EVO).",
    },
    cctK: 4000,
    colorCode: "T0",
    productCodeTemplate: "SPMWHD32AMH0XAT0PT",
    ppfBin: ppfBin(0.507, 0.572),
    chromaticityRank: "T0",
    chromaticityBins: ["TE", "TF", "TG", "TH", "TJ", "TK", "TL", "TM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.T5,
    chromaticityQuads: {
      TW: LM301H_EVO_CHROMATICITY_QUADS.TW,
      TX: LM301H_EVO_CHROMATICITY_QUADS.TX,
      TY: LM301H_EVO_CHROMATICITY_QUADS.TY,
      TZ: LM301H_EVO_CHROMATICITY_QUADS.TZ,
    },
    reference: evoBinReference(0.507, 0.572),
    sourceDocuments: ["Data_Sheet_LM301H_EVO_Rev.2.1.pdf"],
  },
  lm301h_evo_5000k: {
    ...COMMON_EVO,
    id: "lm301h_evo_5000k",
    name: "Samsung LM301H EVO 5000K",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      ppfUmolS: 0.587,
      source: "User-provided (datasheet typical test condition for spectrum, LM301H EVO).",
    },
    cctK: 5000,
    colorCode: "R0",
    productCodeTemplate: "SPMWHD32AMH0XAR0PR",
    ppfBin: ppfBin(0.52, 0.587),
    chromaticityRank: "R0",
    chromaticityBins: ["RE", "RF", "RG", "RH", "RJ", "RK", "RL", "RM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.R5,
    chromaticityQuads: {
      RW: LM301H_EVO_CHROMATICITY_QUADS.RW,
      RX: LM301H_EVO_CHROMATICITY_QUADS.RX,
      RY: LM301H_EVO_CHROMATICITY_QUADS.RY,
      RZ: LM301H_EVO_CHROMATICITY_QUADS.RZ,
    },
    reference: evoBinReference(0.52, 0.587),
    manufacturerHomepageTypical: HOMEPAGE_LM301H_EVO_5000K_CRI80,
    sourceDocuments: ["Data_Sheet_LM301H_EVO_Rev.2.1.pdf", "Samsung homepage tech spec supplied by user"],
  },
  lm301h_evo_6500k: {
    ...COMMON_EVO,
    id: "lm301h_evo_6500k",
    name: "Samsung LM301H EVO 6500K",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      ppfUmolS: 0.587,
      source: "User-provided (datasheet typical test condition for spectrum, LM301H EVO).",
    },
    cctK: 6500,
    colorCode: "P0",
    productCodeTemplate: "SPMWHD32AMH0XAP0PP",
    ppfBin: ppfBin(0.52, 0.587),
    chromaticityRank: "P0",
    chromaticityBins: ["PE", "PF", "PG", "PH", "PJ", "PK", "PL", "PM"],
    macAdamEllipse: LM301H_MACADAM_ELLIPSES.P5,
    chromaticityQuads: {
      PW: LM301H_EVO_CHROMATICITY_QUADS.PW,
      PX: LM301H_EVO_CHROMATICITY_QUADS.PX,
      PY: LM301H_EVO_CHROMATICITY_QUADS.PY,
      PZ: LM301H_EVO_CHROMATICITY_QUADS.PZ,
    },
    reference: evoBinReference(0.52, 0.587),
    sourceDocuments: ["Data_Sheet_LM301H_EVO_Rev.2.1.pdf"],
  },
  lm301h_evo_mint_ma: {
    ...COMMON_EVO,
    id: "lm301h_evo_mint_ma",
    name: "Samsung LM301H EVO Mint White MA",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      ppfUmolS: 0.595,
      source: "User-provided (datasheet typical test condition for spectrum, LM301H EVO mint white).",
      note: "Mint white is treated as equivalent across MA/MB for spectrum anchoring unless a per-bin value is available.",
    },
    colorName: "Mint White MA",
    colorCode: "MA",
    productCodeTemplate: "SPMWHD32AMH0XAMAPL",
    ppfBin: ppfBin(0.52, 0.587),
    chromaticityRank: "MA",
    chromaticityBins: ["M1", "M2"],
    chromaticityQuads: {
      M1: LM301H_EVO_CHROMATICITY_QUADS.M1,
      M2: LM301H_EVO_CHROMATICITY_QUADS.M2,
    },
    reference: evoBinReference(0.52, 0.587),
    sourceDocuments: ["Data_Sheet_LM301H_EVO_Rev.2.1.pdf"],
  },
  lm301h_evo_mint_mb: {
    ...COMMON_EVO,
    id: "lm301h_evo_mint_mb",
    name: "Samsung LM301H EVO Mint White MB",
    beamAngleDeg: 90,
    spectrumCalibration: {
      currentMA: 65,
      solderPointTempC: 25,
      ppfUmolS: 0.595,
      source: "User-provided (datasheet typical test condition for spectrum, LM301H EVO mint white).",
      note: "Mint white is treated as equivalent across MA/MB for spectrum anchoring unless a per-bin value is available.",
    },
    colorName: "Mint White MB",
    colorCode: "MB",
    productCodeTemplate: "SPMWHD32AMH0XAMBPM",
    ppfBin: ppfBin(0.528, 0.595),
    chromaticityRank: "MB",
    chromaticityBins: ["M3", "M4"],
    chromaticityQuads: {
      M3: LM301H_EVO_CHROMATICITY_QUADS.M3,
      M4: LM301H_EVO_CHROMATICITY_QUADS.M4,
    },
    reference: evoBinReference(0.528, 0.595),
    sourceDocuments: ["Data_Sheet_LM301H_EVO_Rev.2.1.pdf"],
  },
};

export function interpolateCurve(points, x) {
  if (points.length === 0)
    throw new Error("Cannot interpolate empty curve.");
  if (points.length === 1)
    return points[0][1];
  if (x <= points[0][0])
    return points[0][1];
  for (let index = 1; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    if (x <= x1) {
      const [x0, y0] = points[index - 1];
      const t = (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return points[points.length - 1][1];
}

export function interpolateInverseCurve(points, y) {
  if (points.length === 0)
    throw new Error("Cannot interpolate empty curve.");
  if (points.length === 1)
    return points[0][0];
  if (y <= points[0][1])
    return points[0][0];
  for (let index = 1; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    if (y <= y1) {
      const [x0, y0] = points[index - 1];
      const t = (y - y0) / (y1 - y0);
      return x0 + (x1 - x0) * t;
    }
  }
  return points[points.length - 1][0];
}

export function getDeratedMaxCurrentMA(led, input) {
  const curves = [...led.deratingCurves.curves].sort((a, b) => a.thermalResistanceJunctionToAmbientCW - b.thermalResistanceJunctionToAmbientCW);
  if (curves.length === 0)
    return led.absoluteMaximum.forwardCurrentMAMax;
  const rth = input.thermalResistanceJunctionToAmbientCW;
  let lower = curves[0];
  let upper = curves[curves.length - 1];
  if (rth <= curves[0].thermalResistanceJunctionToAmbientCW) {
    lower = curves[0];
    upper = curves[0];
  } else if (rth >= curves[curves.length - 1].thermalResistanceJunctionToAmbientCW) {
    lower = curves[curves.length - 1];
    upper = curves[curves.length - 1];
  } else {
    for (let index = 1; index < curves.length; index += 1) {
      if (rth <= curves[index].thermalResistanceJunctionToAmbientCW) {
        lower = curves[index - 1];
        upper = curves[index];
        break;
      }
    }
  }
  const lowerCurrent = interpolateCurve(lower.points, input.ambientTempC);
  const upperCurrent = interpolateCurve(upper.points, input.ambientTempC);
  if (lower === upper) {
    return Math.min(led.absoluteMaximum.forwardCurrentMAMax, lowerCurrent);
  }
  const t = (rth - lower.thermalResistanceJunctionToAmbientCW) /
    (upper.thermalResistanceJunctionToAmbientCW -
      lower.thermalResistanceJunctionToAmbientCW);
  const interpolatedCurrent = lowerCurrent + (upperCurrent - lowerCurrent) * t;
  return Math.min(led.absoluteMaximum.forwardCurrentMAMax, interpolatedCurrent);
}

export function getPreferredReference(led, options = {}) {
  const preferHomepageTypical = options.preferHomepageTypical ?? true;
  if (preferHomepageTypical && led.manufacturerHomepageTypical) {
    const homepage = led.manufacturerHomepageTypical;
    return {
      currentMA: homepage.currentMA,
      solderPointTempC: homepage.solderPointTempC,
      forwardVoltageV: homepage.forwardVoltageV,
      ppfUmolS: homepage.ppfUmolS,
      ppeUmolJ: homepage.ppeUmolJ,
      source: "homepage",
      note: homepage.note,
    };
  }
  return led.reference;
}

export function estimateLedOutput(led, input = {}) {
  const reference = getPreferredReference(led, input);
  // Some LED variants (e.g. standard LM301H CRI70/80/90) do not have a direct
  // datasheet PPF reference. We still need electrical estimates (V/I) for the UI
  // and wiring inference, so do not throw here. PPF/PPE will be 0 in that case
  // and should be estimated via spectrum calibration in higher-level code.
  const curves = LED_CURVES[led.curveSetId];
  const solderPointTempC = input.solderPointTempC ?? reference.solderPointTempC;
  const voltageTemperatureMultiplier = interpolateCurve(curves.relativeForwardVoltageBySolderPointTempC.points, solderPointTempC) / 100;
  let currentMA = input.currentMA;
  if (currentMA === undefined) {
    if (input.forwardVoltageV === undefined) {
      currentMA = reference.currentMA;
    } else {
      // Convert the measured voltage back to its approximate 25 C equivalent,
      // then read current from the Forward Current vs Forward Voltage curve.
      const equivalentVoltageAt25C = input.forwardVoltageV / voltageTemperatureMultiplier;
      currentMA = interpolateCurve(curves.forwardCurrentMAByForwardVoltageV.points, equivalentVoltageAt25C);
    }
  }
  let deratedMaxCurrentMA;
  let currentWasLimitedByDeratingCurve = false;
  if (input.ambientTempC !== undefined &&
    input.thermalResistanceJunctionToAmbientCW !== undefined) {
    deratedMaxCurrentMA = getDeratedMaxCurrentMA(led, {
      ambientTempC: input.ambientTempC,
      thermalResistanceJunctionToAmbientCW: input.thermalResistanceJunctionToAmbientCW,
    });
    if (input.limitCurrentToDeratingCurve && currentMA > deratedMaxCurrentMA) {
      currentMA = deratedMaxCurrentMA;
      currentWasLimitedByDeratingCurve = true;
    }
  }
  const currentMultiplier = interpolateCurve(curves.relativePpfByCurrentMA.points, currentMA) / 100;
  const temperatureMultiplier = interpolateCurve(curves.relativePpfBySolderPointTempC.points, solderPointTempC) / 100;
  const forwardVoltageAt25C = interpolateInverseCurve(curves.forwardCurrentMAByForwardVoltageV.points, currentMA);
  const calculatedForwardVoltageV = forwardVoltageAt25C * voltageTemperatureMultiplier;
  const forwardVoltageV = input.forwardVoltageV ?? calculatedForwardVoltageV;
  const systemEfficiency = input.systemEfficiency ?? led.systemEfficiency;
  const basePpf = Number(reference.ppfUmolS);
  const ppfUmolS = Number.isFinite(basePpf) && basePpf > 0
    ? basePpf * currentMultiplier * temperatureMultiplier * systemEfficiency
    : 0;
  const electricalPowerW = (currentMA / 1000) * forwardVoltageV;
  const ppeUmolJ = electricalPowerW > 0 ? ppfUmolS / electricalPowerW : 0;
  return {
    ledId: led.id,
    currentMA,
    forwardVoltageV,
    solderPointTempC,
    electricalPowerW,
    ppfUmolS,
    ppeUmolJ,
    currentMultiplier,
    temperatureMultiplier,
    voltageTemperatureMultiplier,
    referenceSource: reference.source,
    deratedMaxCurrentMA,
    currentWasLimitedByDeratingCurve,
  };
}

// Migration helper for old code:
// old basePpfdFactor -> getPreferredReference(led).ppeUmolJ
// old tempCoefficient -> LED_CURVES[led.curveSetId].relativePpfBySolderPointTempC
// old driveEfficiency -> led.systemEfficiency or input.systemEfficiency
// new thermal safety limit -> led.deratingCurves and getDeratedMaxCurrentMA()
export const LED_LIBRARY = LED_LIBRARY_V2;
