import { memo } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { TOKEN_RADIUS } from "../../constants/pool";
import { COLORS, FONTS } from "../../constants/theme";
import type { Player, PlayerPos } from "../../types";
import { getTokenColors } from "../../utils/colors";

interface Props {
  player: Player;
  pos: PlayerPos;
  selected: boolean;
  swapColors: boolean;
  /** Rotació (graus) per mantenir el text dret quan la piscina està girada. */
  rot: number;
  onPointerDown: (e: ReactPointerEvent, id: string) => void;
}

export const PlayerToken = memo(function PlayerToken({ player, pos, selected, swapColors, rot, onPointerDown }: Props) {
  const colors = getTokenColors(player.team, swapColors);
  const stroke = selected ? COLORS.accent : colors.stroke;

  return (
    <g filter="url(#tokenShadow)" className="player-token" style={{ cursor: "grab" }} onPointerDown={e => onPointerDown(e, player.id)}>
      <g transform={`translate(${pos.x},${pos.y}) rotate(${rot})`}>
        {selected && <circle r={24} fill="none" stroke={COLORS.accent} strokeWidth={2} strokeDasharray="4 3" opacity={0.8} />}
        <circle r={TOKEN_RADIUS} fill="rgba(0,0,0,0.3)" cx={1} cy={2} />
        <circle r={TOKEN_RADIUS} fill={colors.fill} stroke={stroke} strokeWidth={selected ? 2.5 : 1.5} />
        <text textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="800" fontFamily={FONTS.token} fill={colors.text} y={1}>
          {player.display}
        </text>
        {/* Indicador de pilota (a l'altre costat si la vista està girada) */}
        {pos.hasBall && <circle r={5} cx={12} cy={rot === 90 ? -12 : 12} fill={COLORS.ball} stroke={COLORS.background} strokeWidth={1.5} />}
      </g>
    </g>
  );
});
