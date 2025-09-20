import type { PctPoint } from "./stadiumTypes";

export const vbW = 100;
export const vbH = 62.5;

export const ANG_GAP = 2;
export const CIRCLE_MARGIN = 3;

export function circleCenter(): [number, number] {
  return [50, 31.25];
}

export function circleOuterRadius() {
  return Math.min(vbW / 2 - CIRCLE_MARGIN, vbH / 2 - CIRCLE_MARGIN);
}

export function computeRingPack(layers: number, voidRatio = 0.35, gap = 1.6) {
  const R = circleOuterRadius();
  const [cx, cy] = circleCenter();
  const rVoid = Math.max(4, R * voidRatio);
  const usable = R - rVoid - Math.max(0, layers - 1) * gap;
  const thick = layers > 0 ? Math.max(1, usable / layers) : 0;
  return { cx, cy, R, rVoid, thick, gap };
}

export function ringSectorPoints(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number,
  steps = 16
): PctPoint[] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const pts: PctPoint[] = [];
  const step = (endDeg - startDeg) / steps;
  for (let i = 0; i <= steps; i++) {
    const a = toRad(startDeg + i * step);
    pts.push([cx + rOuter * Math.cos(a), cy + rOuter * Math.sin(a)]);
  }
  for (let i = steps; i >= 0; i--) {
    const a = toRad(startDeg + i * step);
    pts.push([cx + rInner * Math.cos(a), cy + rInner * Math.sin(a)]);
  }
  return pts;
}

export function rectCell(x: number, y: number, w: number, h: number): PctPoint[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}
