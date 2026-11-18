import { memo } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { BALL_RADIUS } from "../../constants/pool";
import { COLORS } from "../../constants/theme";
import type { BallPos } from "../../types";

interface Props {
  ball: BallPos;
  onPointerDown: (e: ReactPointerEvent) => void;
}

export const BallToken = memo(function BallToken({ ball, onPointerDown }: Props) {
  return (
    <g filter="url(#ballGlow)" onPointerDown={onPointerDown} style={{ cursor: "grab" }}>
      <circle r={BALL_RADIUS + 1} cx={ball.x} cy={ball.y} fill={COLORS.ballGlow} />
      <circle r={BALL_RADIUS} cx={ball.x} cy={ball.y} fill={COLORS.ball} />
      <circle r={BALL_RADIUS} cx={ball.x} cy={ball.y} fill="none" stroke={COLORS.ballStroke} strokeWidth={1.5} />
    </g>
  );
});
