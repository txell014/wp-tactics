import { BALL_CURVE, FAKE_CYCLES, FAKE_OFFSET, PATH_CURVE } from "../constants/pool";
import { PLAYER_BY_ID } from "../constants/players";
import { COLORS } from "../constants/theme";
import type { AnimationPath, AppMode, BallPos, FrameData, Players } from "../types";
import { getTokenColors } from "./colors";
import { clamp, controlPoint, hasMoved, quadAt, quadPath } from "./geometry";

export interface FrameRender {
  players: Players;
  ball: BallPos;
  paths: AnimationPath[];
}

/** Progrés (0..1) dins del frame actiu; sempre 0 fora del mode animació. */
export function frameProgress(appMode: AppMode, elapsed: number, activeFrame: number, frameDuration: number): number {
  if (appMode !== "animacio" || frameDuration <= 0) return 0;
  return clamp((elapsed - activeFrame * frameDuration) / frameDuration, 0, 1);
}

/** Posicions interpolades de jugadores i pilota (passada o finta) i les trajectòries recorregudes. */
export function computeFrameRender(
  frames: FrameData[],
  activeFrame: number,
  t: number,
  showPaths: boolean,
  swapColors: boolean
): FrameRender {
  // Comprovació de seguretat per evitar errors si frames o activeFrame no són vàlids
  const start = frames && frames[activeFrame] ? frames[activeFrame] : frames[0];
  
  if (!start) {
    return { players: {}, ball: { x: 0, y: 0 }, paths: [] };
  }

  const nextIdx = Math.min((frames?.length ?? 1) - 1, activeFrame + 1);
  const end = frames[nextIdx] || start;
  const hasNext = nextIdx !== activeFrame;

  const players: Players = { ...start.players };
  let ball: BallPos = { ...start.ball };
  const paths: AnimationPath[] = [];

  // 1. Jugadores: moviment en corba cap al frame següent
  if (t > 0 && hasNext) {
    for (const id of Object.keys(players)) {
      const p0 = start.players[id];
      const p2 = end.players[id];
      if (!p0 || !p2 || p0.isHidden || !hasMoved(p0, p2)) continue;

      const { control, point } = quadAt(p0, controlPoint(p0, p2, PATH_CURVE), p2, t);
      players[id] = { ...p0, x: point.x, y: point.y };
      if (showPaths && PLAYER_BY_ID[id]) {
        paths.push({
          id,
          d: quadPath(p0, control, point),
          color: getTokenColors(PLAYER_BY_ID[id].team, swapColors).fill,
          isBall: false,
        });
      }
    }
  }

  // 2. Pilota: passada (si canvia de lloc) o finta (si no)
  if (t > 0) {
    const b0 = start.ball;
    const b2 = end.ball;
    if (hasNext && hasMoved(b0, b2)) {
      const { control, point } = quadAt(b0, controlPoint(b0, b2, BALL_CURVE), b2, t);
      ball = { x: point.x, y: point.y };
      if (showPaths) paths.push({ id: "ball", d: quadPath(b0, control, point), color: COLORS.ball, isBall: true });
    } else {
      const holderId = Object.keys(start.players).find(id => start.players[id].hasBall);
      if (holderId && start.actions.some(a => a.type === "fake" && a.attackerId === holderId)) {
        const wave = (1 - Math.cos(t * Math.PI * 2 * FAKE_CYCLES)) / 2; // 0 → 1 → 0
        ball = { x: b0.x + FAKE_OFFSET.x * wave, y: b0.y + FAKE_OFFSET.y * wave };
      }
    }
  }

  return { players, ball, paths };
}
