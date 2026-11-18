import type { ExportResolution, PoolView } from "../types";

// ─── Dimensions de la piscina ────────────────────────────────────────────────
export const POOL_W = 800;
export const POOL_H = 460;
export const POOL_MARGIN = 20;
export const POOL_SVG_ID = "pool-svg";

export const VIEW_DIMS: Record<PoolView, { w: number; h: number }> = {
  full: { w: POOL_W, h: POOL_H },
  half: { w: POOL_H, h: 300 },
};
export const DEFAULT_POOL_VIEW: PoolView = "half";

/** A la vista "half" només es veu la meitat dreta de la piscina (x >= HALF_VIEW_MIN_X). */
export const HALF_VIEW_MIN_X = POOL_W - VIEW_DIMS.half.h;
export const HALF_VIEW_MATRIX = `matrix(0 -1 1 0 0 ${POOL_W})`;

/** Línies de la piscina: distància (m) a la porteria, sobre 30 m de camp. */
export const POOL_LENGTH_M = 30;
export const POOL_LINES = [
  { meters: 2, color: "#e74c3c" },
  { meters: 5, color: "#f59e0b" },
  { meters: 6, color: "#84cc16" },
];
export const GOAL_WIDTH = 70;

// ─── Fitxes i pilota ─────────────────────────────────────────────────────────
export const TOKEN_RADIUS = 15;
export const BALL_RADIUS = 9;
/** Desplaçament de la pilota respecte a la jugadora que la porta. */
export const BALL_OFFSET = { x: 12, y: 12 };
export const EXCLUSION_SPOT = { x: 770, y: 420 };
export const EXCLUSION_STACK_GAP = 32;

// ─── Interacció ──────────────────────────────────────────────────────────────
export const PROXIMITY_RADIUS = 80;
export const DRAG_THRESHOLD_PX = 3;
export const MIN_MOVE_PX = 5;
export const TRAIL_LIFETIME_MS = 2000;
export const TRAIL_TICK_MS = 50;

// ─── Animació ────────────────────────────────────────────────────────────────
export const PATH_CURVE = 0.3;
export const BALL_CURVE = 0.4;
/** La pilota va de (x,y) a (x+dx, y+dy) i torna durant una finta. */
export const FAKE_OFFSET = { x: 0, y: 8 };
export const FAKE_CYCLES = 2;

export const DEFAULT_FRAME_DURATION = 2;
export const MIN_FRAME_DURATION = 0.5;
export const MAX_TICK_SECONDS = 0.1;

// ─── Exportació ──────────────────────────────────────────────────────────────
export const EXPORT_RESOLUTIONS: ExportResolution[] = [
  { label: "720p HD", width: 1280, height: 720 },
  { label: "1080p Full HD", width: 1920, height: 1080 },
];

// ─── Disseny de la pantalla ──────────────────────────────────────────────────
/** Si és false, el timeline només es mostra en mode animació. */
export const SHOW_TIMELINE_IN_BOARD_MODE = false;
/** Píxels verticals reservats (capçalera + marges [+ timeline]) per calcular l'amplada de la piscina. */
export const LAYOUT_RESERVED_PX = { withTimeline: 265, withoutTimeline: 100 };
export const TIMELINE_HEIGHT_PX = 165;
