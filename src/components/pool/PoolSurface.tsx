import { memo } from "react";
import { GOAL_WIDTH, POOL_H, POOL_LENGTH_M, POOL_LINES, POOL_MARGIN, POOL_W } from "../../constants/pool";
import { COLORS } from "../../constants/theme";

const FIELD_W = POOL_W - POOL_MARGIN * 2;
const GOAL_Y1 = POOL_H / 2 - GOAL_WIDTH / 2;
const GOAL_Y2 = POOL_H / 2 + GOAL_WIDTH / 2;
const GOAL_DEPTH = 8;
const NET_ROWS = Array.from({ length: 6 }, (_, i) => (GOAL_WIDTH / 5) * i);

/** Gradients i filtres SVG compartits per la piscina, les fitxes i la pilota. */
export function PoolDefs() {
  const [c0, c1, c2] = COLORS.poolWater;
  return (
    <defs>
      <linearGradient id="poolGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={c0} />
        <stop offset="50%" stopColor={c1} />
        <stop offset="100%" stopColor={c2} />
      </linearGradient>
      <filter id="ballGlow">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id="tokenShadow">
        <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
      </filter>
    </defs>
  );
}

function Goal({ side }: { side: "left" | "right" }) {
  const left = side === "left";
  const gx = left ? POOL_MARGIN : POOL_W - POOL_MARGIN;
  const x0 = left ? gx - 2 : gx - 6;
  const x1 = x0 + GOAL_DEPTH;
  const post = { r: 3, cx: left ? x1 : x0, fill: "#fff", opacity: 0.9 };

  return (
    <g>
      <rect x={x0} y={GOAL_Y1} width={GOAL_DEPTH} height={GOAL_WIDTH} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5} />
      {NET_ROWS.map(dy => (
        <line key={dy} x1={x0} y1={GOAL_Y1 + dy} x2={x1} y2={GOAL_Y1 + dy} stroke="rgba(255,255,255,0.25)" strokeWidth={0.5} />
      ))}
      {[x0, x1].map(x => (
        <line key={x} x1={x} y1={GOAL_Y1} x2={x} y2={GOAL_Y2} stroke="rgba(255,255,255,0.25)" strokeWidth={0.5} />
      ))}
      <circle {...post} cy={GOAL_Y1} />
      <circle {...post} cy={GOAL_Y2} />
    </g>
  );
}

/** Dibuix estàtic de la piscina: aigua, línies de camp i porteries. */
export const PoolSurface = memo(function PoolSurface() {
  return (
    <>
      <rect x={0} y={0} width={POOL_W} height={POOL_H} fill="url(#poolGrad)" rx={4} />
      <rect x={POOL_MARGIN} y={POOL_MARGIN} width={FIELD_W} height={POOL_H - POOL_MARGIN * 2} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
      <line x1={POOL_W / 2} y1={POOL_MARGIN} x2={POOL_W / 2} y2={POOL_H - POOL_MARGIN} stroke="rgba(255,255,255,0.7)" strokeWidth={2} />

      {POOL_LINES.flatMap(({ meters, color }) => {
        const offset = FIELD_W * (meters / POOL_LENGTH_M);
        return [POOL_MARGIN + offset, POOL_W - POOL_MARGIN - offset].map(x => (
          <line key={`${meters}-${x}`} x1={x} y1={POOL_MARGIN} x2={x} y2={POOL_H - POOL_MARGIN} stroke={color} strokeWidth={1.5} opacity={0.8} />
        ));
      })}

      <Goal side="left" />
      <Goal side="right" />
    </>
  );
});
