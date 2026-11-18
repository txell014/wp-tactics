import { Circle, Eye, EyeOff, Pointer, Zap } from "lucide-react";
import { COLORS, FONTS } from "../../constants/theme";
import { ui } from "../../styles/classNames";
import type { Player, PlayerPos } from "../../types";
import { getTokenColors } from "../../utils/colors";
import { clubOf, sideLabel } from "../../utils/teams";

interface Props {
  player: Player | null;
  pos: PlayerPos | null;
  excluded: boolean;
  swapColors: boolean;
  onToggleBall: () => void;
  onToggleVisibility: () => void;
}

function teamDescription(player: Player, swapColors: boolean) {
  if (player.team === "defenseKeeper" || player.team === "attackKeeper") return "Portera";
  return `Equip ${clubOf(player.team, swapColors)} (${sideLabel(player.team)})`;
}

export function Inspector({ player, pos, excluded, swapColors, onToggleBall, onToggleVisibility }: Props) {
  return (
    <div className="p-3 border-b border-[#1e2d42]">
      <div className={ui.sectionTitle}>Inspector</div>

      {player && pos ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <svg width={32} height={32} viewBox="0 0 32 32">
              <circle r={14} cx={16} cy={16} fill={getTokenColors(player.team, swapColors).fill} />
              <text textAnchor="middle" dominantBaseline="central" x={16} y={17} fontSize={14} fontWeight="800" fill={getTokenColors(player.team, swapColors).text} fontFamily={FONTS.token}>
                {player.display}
              </text>
            </svg>
            <div>
              <div className="font-display font-bold text-[#f0f4f8] text-xl leading-none">{player.label}</div>
              <div className="text-sm text-[#8899aa] mt-0.5">{teamDescription(player, swapColors)}</div>
            </div>
          </div>

          {excluded && (
            <div className="mb-3 bg-[#2a1515] border border-[#e74c3c] rounded px-2 py-1.5 flex items-center gap-2">
              <Zap size={14} className="text-[#e74c3c]" />
              <span className="text-[#e74c3c] text-[12px] font-bold uppercase tracking-wider">Jugadora Expulsada</span>
            </div>
          )}

          <div className="mb-2">
            <div className="text-[13px] text-[#8899aa] font-mono mb-1.5">Possessió Pilota</div>
            <button onClick={onToggleBall} className={`${ui.panelButton} ${pos.hasBall ? ui.panelButtonBall : ui.panelButtonIdle}`}>
              <Circle size={12} fill={pos.hasBall ? COLORS.ball : "#4a5568"} color={pos.hasBall ? COLORS.ball : "#4a5568"} />
              {pos.hasBall ? "Pilota a la mà" : "Lliure / Passada"}
            </button>
          </div>

          <button onClick={onToggleVisibility} className={`mt-2 ${ui.panelButton} ${ui.panelButtonIdle}`}>
            {pos.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
            {pos.isHidden ? "Restaurar Jugadora" : "Ocultar Jugadora"}
          </button>
        </div>
      ) : (
        <div className="text-center py-4 flex flex-col items-center">
          <Pointer size={28} className="text-[#2a3a55] mb-2" />
          <div className="text-sm text-[#4a5568]">Clica una jugadora per inspeccionar-la</div>
        </div>
      )}
    </div>
  );
}
