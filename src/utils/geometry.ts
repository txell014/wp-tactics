import { MIN_MOVE_PX } from "../constants/pool";
import type { Pt, TrailPoint } from "../types";

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const distance = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
/** Un moviment menor que MIN_MOVE_PX es considera "no s'ha mogut" (no es dibuixa trajectòria). */
export const hasMoved = (a: Pt, b: Pt) => distance(a, b) >= MIN_MOVE_PX;

/** Punt de control d'una corba perpendicular al segment p0→p2. */
export function controlPoint(p0: Pt, p2: Pt, curve: number): Pt {
  return {
    x: (p0.x + p2.x) / 2 + (p2.y - p0.y) * curve,
    y: (p0.y + p2.y) / 2 - (p2.x - p0.x) * curve,
  };
}

/** Tram [0,t] d'una Bézier quadràtica: punt actual i punt de control del tram. */
export function quadAt(p0: Pt, p1: Pt, p2: Pt, t: number) {
  const a = { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
  const b = { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t };
  return { control: a, point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t } };
}

export const quadPath = (from: Pt, control: Pt, to: Pt) =>
  `M${from.x},${from.y} Q${control.x},${control.y} ${to.x},${to.y}`;

export const staticCurvePath = (from: Pt, to: Pt, curve: number) =>
  quadPath(from, controlPoint(from, to, curve), to);

/** Traç suau (quadràtiques entre punts mitjans) per a la cua de la pissarra. */
export function createSmoothPath(points: TrailPoint[]): string {
  if (points.length === 0) return "";
  const first = points[0];
  if (points.length === 1) return `M${first.x},${first.y}`;
  let d = `M${first.x},${first.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q${points[i].x},${points[i].y} ${xc},${yc}`;
  }
  const last = points[points.length - 1];
  return `${d} L${last.x},${last.y}`;
}
