import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { HALF_VIEW_MATRIX, HALF_VIEW_MIN_X, POOL_SVG_ID, POOL_W, VIEW_DIMS } from "../../constants/pool";
import { ALL_PLAYERS } from "../../constants/players";
import { FONTS } from "../../constants/theme";
import { usePoolInteraction } from "../../hooks/usePoolInteraction";
import type { AppMode, FrameData, PoolView } from "../../types";
import { computeFrameRender, frameProgress } from "../../utils/animation";
import { ActionsLayer } from "./ActionsLayer";
import { BallToken } from "./BallToken";
import { MotionPaths } from "./MotionPaths";
import { PlayerToken } from "./PlayerToken";
import { PoolLegend } from "./PoolLegend";
import { PoolDefs, PoolSurface } from "./PoolSurface";

interface Props {
  view: PoolView;
  frames: FrameData[];
  activeFrame: number;
  selectedId: string | null;
  appMode: AppMode;
  elapsed: number;
  frameDuration: number;
  showPaths: boolean;
  showLegend: boolean;
  swapColors: boolean;
  hideFakeIcons: boolean;
  onSelectPlayer: (id: string | null) => void;
  onMovePlayer: (id: string, x: number, y: number) => void;
  onMoveBall: (x: number, y: number) => void;
  onContextMenu: (id: string, other: string | null, x: number, y: number) => void;
  onCloseContext: () => void;
}

export function PoolCanvas({
  view,
  frames,
  activeFrame,
  selectedId,
  appMode,
  elapsed,
  frameDuration,
  showPaths,
  showLegend,
  swapColors,
  hideFakeIcons,
  onSelectPlayer,
  onMovePlayer,
  onMoveBall,
  onContextMenu,
  onCloseContext,
}: Props) {
  const frame = frames && frames[activeFrame] ? frames[activeFrame] : frames?.[0];  
  if (!frame) return null;

  const prevFrame = activeFrame > 0 ? frames[activeFrame - 1] : undefined;
  const rot = view === "half" ? 90 : 0;

  const { svgRef, liveTrails, onPointerDown } = usePoolInteraction({
    view,
    frame,
    appMode,
    swapColors,
    selectedId,
    onSelectPlayer,
    onMovePlayer,
    onMoveBall,
    onContextMenu,
    onCloseContext,
  });

  const handlePlayerDown = useCallback((e: ReactPointerEvent, id: string) => onPointerDown(e, id, "player"), [onPointerDown]);
  const handleBallDown = useCallback((e: ReactPointerEvent) => onPointerDown(e, "ball", "ball"), [onPointerDown]);

  const pathsVisible = appMode === "animacio" && showPaths;
  const t = frameProgress(appMode, elapsed, activeFrame, frameDuration);
  const render = computeFrameRender(frames, activeFrame, t, pathsVisible, swapColors);

  return (
    <div className="relative w-full h-full" onPointerDown={() => { onSelectPlayer(null); onCloseContext(); }}>
      <svg
        id={POOL_SVG_ID}
        ref={svgRef}
        viewBox={`0 0 ${VIEW_DIMS[view].w} ${VIEW_DIMS[view].h}`}
        className="w-full h-full"
        style={{ display: "block", touchAction: "none" }}
      >
        <PoolDefs />

        {/* Tot el que viu en coordenades de piscina es gira junt a la vista "half" */}
        <g transform={view === "half" ? HALF_VIEW_MATRIX : undefined}>
          <PoolSurface />

          {view === "full" && (
            <text x={POOL_W / 2} y={15} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.4)" fontFamily={FONTS.mono}>
              MIG CAMP
            </text>
          )}

          <MotionPaths
            appMode={appMode}
            showPaths={pathsVisible}
            t={t}
            frame={frame}
            prevFrame={prevFrame}
            paths={render.paths}
            liveTrails={liveTrails}
            swapColors={swapColors}
          />

          {ALL_PLAYERS.map(player => {
            const pos = render.players[player.id];
            if (!pos || pos.isHidden) return null;
            if (view === "half" && pos.x < HALF_VIEW_MIN_X) return null;
            return (
              <PlayerToken
                key={player.id}
                player={player}
                pos={pos}
                selected={selectedId === player.id}
                swapColors={swapColors}
                rot={rot}
                onPointerDown={handlePlayerDown}
              />
            );
          })}

          <ActionsLayer actions={frame?.actions ?? []} players={render.players} rot={rot} hideFake={hideFakeIcons} />
          <BallToken ball={render.ball} onPointerDown={handleBallDown} />
        </g>

        {showLegend && <PoolLegend view={view} swapColors={swapColors} />}
      </svg>
    </div>
  );
}
