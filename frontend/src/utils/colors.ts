// frontend/src/utils/colors.ts

/**
 * Convert sentiment avg [-1..1] into a color:
 * -1 = red, 0 = yellow, 1 = green
 */
export function colorForAvg(avg: number): string {
  const t = Math.max(-1, Math.min(1, avg));
  const x = (t + 1) / 2; // normalize [-1..1] -> [0..1]
  const hue = 120 * x;   // 0=red, 60=yellow, 120=green
  return `hsl(${hue.toFixed(0)} 80% 50%)`;
}
