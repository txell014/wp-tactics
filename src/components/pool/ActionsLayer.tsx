import { Hand, Waves } from "lucide-react";
import { COLORS, FONTS } from "../../constants/theme";
import type { Players, PlayerPos, Pt, TacticalAction } from "../../types";

const LINE_GAP = 17;
const MIN_LINE_LENGTH = 36;

/** Segment entre dues fitxes (sense tocar-les) i si és prou llarg per dibuixar-se. */
function connector(att: Pt, def: Pt) {
  const dx = def.x - att.x;
  const dy = def.y - att.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: att.x + ux * LINE_GAP,
    y1: att.y + uy * LINE_GAP,
    x2: def.x - ux * LINE_GAP,
    y2: def.y - uy * LINE_GAP,
    visible: len > MIN_LINE_LENGTH,
  };
}

function FakeMarker({ att, rot }: { att: PlayerPos; rot: number }) {
  return (
    <g transform={`translate(${att.x + 20}, ${att.y - 20}) rotate(${rot})`}>
      <circle r={11} fill={COLORS.surface} stroke={COLORS.ball} strokeWidth={1.5} />
      <Waves x={-7} y={-7} size={14} color={COLORS.ball} strokeWidth={2.5} />
    </g>
  );
}

function BlockMarker({ att, def, rot }: { att: PlayerPos; def: PlayerPos; rot: number }) {
  const { x1, y1, x2, y2, visible } = connector(att, def);
  const mx = (att.x + def.x) / 2;
  const my = (att.y + def.y) / 2;
  return (
    <g>
      {visible && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={COLORS.warning} strokeWidth={4} strokeLinecap="round" />}
      <circle cx={mx} cy={my} r={9} fill={COLORS.surface} stroke={COLORS.warning} strokeWidth={1.5} />
      <g transform={`rotate(${rot} ${mx} ${my})`}>
        <Hand x={mx - 6} y={my - 6} size={12} color={COLORS.warning} strokeWidth={2.5} />
      </g>
    </g>
  );
}

function ExclusionMarker({ def, rot }: { def: PlayerPos; rot: number }) {
  const lx = rot ? def.x + 33 : def.x;
  const ly = rot ? def.y : def.y - 33;
  return (
    <g>
      <circle cx={def.x} cy={def.y} r={15} fill="rgba(231,76,60,0.45)" />
      <circle cx={def.x} cy={def.y} r={22} fill="none" stroke={COLORS.danger} strokeWidth={2}>
        <animate attributeName="r" values="20;27;20" dur="1.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <g transform={`rotate(${rot} ${lx} ${ly})`}>
        <rect x={lx - 20} y={ly - 9} width={40} height={18} rx={9} fill={COLORS.danger} />
        <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="800" fill="#fff" fontFamily={FONTS.label}>
          EXP
        </text>
      </g>
    </g>
  );
}

const TURN_RADIUS = 27;
const TURN_START = (-150 * Math.PI) / 180;
const TURN_END = (100 * Math.PI) / 180;

function TurnMarker({ att, def }: { att: PlayerPos; def: PlayerPos }) {
  const { x1, y1, x2, y2, visible } = connector(att, def);
  const r = TURN_RADIUS;
  const sx = def.x + r * Math.cos(TURN_START);
  const sy = def.y + r * Math.sin(TURN_START);
  const ex = def.x + r * Math.cos(TURN_END);
  const ey = def.y + r * Math.sin(TURN_END);
  // Punta de fletxa tangent a l'arc
  const tx = -Math.sin(TURN_END);
  const ty = Math.cos(TURN_END);
  const nx = Math.cos(TURN_END);
  const ny = Math.sin(TURN_END);
  const arrow = [`${ex + tx * 8},${ey + ty * 8}`, `${ex + nx * 5},${ey + ny * 5}`, `${ex - nx * 5},${ey - ny * 5}`].join(" ");

  return (
    <g>
      {visible && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={COLORS.accent} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />}
      <path d={`M${sx},${sy} A${r},${r} 0 1 1 ${ex},${ey}`} fill="none" stroke={COLORS.accent} strokeWidth={3} strokeLinecap="round" />
      <polygon points={arrow} fill={COLORS.accent} />
    </g>
  );
}

interface Props {
  actions: TacticalAction[];
  players: Players;
  rot: number;
  /** Amaga la icona de finta (durant la reproducció i l'exportació). */
  hideFake: boolean;
}

export function ActionsLayer({ actions, players, rot, hideFake }: Props) {
  return (
    <g style={{ pointerEvents: "none" }}>
      {actions.map(a => {
        const att = players[a.attackerId];
        if (!att || att.isHidden) return null;
        const key = `${a.type}-${a.attackerId}-${a.defenderId}`;

        // La finta només es mostra amb la pilota a la mà i amb l'animació aturada
        if (a.type === "fake") return hideFake || !att.hasBall ? null : <FakeMarker key={key} att={att} rot={rot} />;

        // La resta d'accions necessiten una defensora visible
        const def = players[a.defenderId];
        if (!def || def.isHidden) return null;

        switch (a.type) {
          case "block":
            return <BlockMarker key={key} att={att} def={def} rot={rot} />;
          case "exclusion":
            return <ExclusionMarker key={key} def={def} rot={rot} />;
          case "turn":
            return <TurnMarker key={key} att={att} def={def} />;
        }
      })}
    </g>
  );
}
