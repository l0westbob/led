export const PRESET_BOARDS = [
  {
    id: "xt308",
    name: "LED Tech XT 308",
    ledType: "lm301h_cri80_5000k",
    emitters: [],
    widthMm: 440,
    depthMm: 285,
    ledCount: 308,
    columns: 22,
    rows: 14,
    spacingXMm: 20,
    spacingYMm: 18,
    // XT 308 product-page electrical points (I, V, P):
    // 0.350 A -> 36.51 V (12.78 W)
    // 0.700 A -> 37.14 V (26.00 W)
    // 1.050 A -> 37.63 V (39.51 W)
    // 1.400 A -> 38.06 V (53.28 W)
    // 1.750 A -> 38.44 V (67.27 W)
    // 2.100 A -> 38.80 V (81.48 W)
    // 2.800 A -> 39.48 V (110.54 W)
    // 3.500 A -> 40.08 V (140.28 W)
    voltageV: 38.6,
    currentA: 2,
    temperatureC: 50,
    // Electrical wiring (not the physical layout grid):
    // 22 parallel strings, each with 14 LEDs in series => 22 * 14 = 308 LEDs.
    seriesCount: 14,
    parallelCount: 22,
    distanceCm: 35,
    roomWidthCm: 120,
    roomDepthCm: 120,
    fixtureColumns: 1,
    fixtureRows: 1,
    fixtureSpacingXCm: 20,
    fixtureSpacingYCm: 20,
  },
];
