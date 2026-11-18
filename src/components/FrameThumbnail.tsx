import { memo } from "react";
import { POOL_H, POOL_W } from "../constants/pool";
import { PLAYER_BY_ID } from "../constants/players";
import { COLORS } from "../constants/theme";
import type { FrameData } from "../types";
import { getTokenColors } from "../utils/colors";

const W = 100;
const H = 58;

export const FrameThumbnail = memo(function FrameThumbnail({ frame, swapColors }: { frame: FrameData; swapColors: boolean }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      <rect width={W} height={H} fill={COLORS.thumbnailWater} />
      <line x1={50} y1={2} x2={50} y2={56} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
      <rect x={2} y={2} width={96} height={54} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
      <rect x={0} y={22} width={3} height={14} fill="rgba(255,255,255,0.5)" />
      <rect x={97} y={22} width={3} height={14} fill="rgba(255,255,255,0.5)" />
      {Object.entries(frame.players).map(([id, pos]) =>
        pos.isHidden ? null : (
          <circle key={id} cx={(pos.x * W) / POOL_W} cy={(pos.y * H) / POOL_H} r={3} fill={getTokenColors(PLAYER_BY_ID[id].team, swapColors).fill} />
        )
      )}
      <circle cx={(frame.ball.x * W) / POOL_W} cy={(frame.ball.y * H) / POOL_H} r={2.5} fill={COLORS.ball} />
    </svg>
  );
});
