/**
 * Generates a heatmap preview color from a normalized 0..1 range.
 *
 * @param {number} value
 * @returns {string}
 */
export function createHeatmapColor(value: number) {
  const stops = [
    [14, 25, 44],
    [25, 79, 120],
    [39, 171, 208],
    [122, 224, 160],
    [224, 227, 98],
    [255, 127, 80],
  ];

  const clamped = Math.min(1, Math.max(0, value));
  const scaled = clamped * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(scaled));
  const mix = scaled - index;
  const [r1, g1, b1] = stops[index];
  const [r2, g2, b2] = stops[index + 1];
  const r = Math.round(r1 + (r2 - r1) * mix);
  const g = Math.round(g1 + (g2 - g1) * mix);
  const b = Math.round(b1 + (b2 - b1) * mix);

  return `rgb(${r}, ${g}, ${b})`;
}
