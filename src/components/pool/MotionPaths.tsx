import { BALL_CURVE, PATH_CURVE } from "../../constants/pool";
import { PLAYER_BY_ID } from "../../constants/players";
import { COLORS } from "../../constants/theme";
import type { AnimationPath, AppMode, FrameData, LiveTrail } from "../../types";
import { getTokenColors } from "../../utils/colors";
import { createSmoothPath, hasMoved, staticCurvePath } from "../../utils/geometry";

interface Props {
  appMode: AppMode;
  showPaths: boolean;
  /** Progrés (0..1) dins del frame actiu. */
  t: number;
  frame: FrameData;
  prevFrame?: FrameData;
  /** Trajectòries recorregudes fins ara durant l'animació. */
  paths: AnimationPath[];
  liveTrails: Record<string, LiveTrail>;
  swapColors: boolean;
}

/** Línies de moviment: cua de la pissarra, recorregut del frame anterior i trajectòries animades. */
export function MotionPaths({ appMode, showPaths, t, frame, prevFrame, paths, liveTrails, swapColors }: Props) {
  // Pissarra: cua discontínua que s'esvaeix
  if (appMode === "pissarra") {
    return (
      <>
        {Object.entries(liveTrails).map(([id, trail]) => (
          <path key={id} d={createSmoothPath(trail.points)} fill="none" stroke={trail.color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 8" opacity={0.7} />
        ))}
      </>
    );
  }

  if (!showPaths) return null;

  return (
    <>
      {/* Al començament d'un frame es mostra d'on ve cada jugadora */}
      {t === 0 && prevFrame && (
        <>
          {Object.entries(frame.players).map(([id, cur]) => {
            const prev = prevFrame.players[id];
            if (!prev || cur.isHidden || prev.isHidden || !hasMoved(prev, cur)) return null;
            return (
              <path key={id} d={staticCurvePath(prev, cur, PATH_CURVE)} fill="none" stroke={getTokenColors(PLAYER_BY_ID[id].team, swapColors).fill} strokeWidth={2.5} strokeDasharray="6 4" opacity={0.8} className="motion-path" />
            );
          })}
          {hasMoved(prevFrame.ball, frame.ball) && (
            <path d={staticCurvePath(prevFrame.ball, frame.ball, BALL_CURVE)} fill="none" stroke={COLORS.ball} strokeWidth={3} strokeDasharray="6 4" opacity={0.8} className="motion-path" />
          )}
        </>
      )}

      {/* Durant l'animació es dibuixa el tram ja recorregut */}
      {paths.map(path => (
        <path key={path.id} d={path.d} fill="none" stroke={path.color} strokeWidth={path.isBall ? 3 : 2.5} opacity={path.isBall ? 1 : 0.9} strokeDasharray="6 4" className="motion-path" />
      ))}
    </>
  );
}
