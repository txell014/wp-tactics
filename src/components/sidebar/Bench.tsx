import { ROSTER_ATTACK, ROSTER_DEFENSE } from "../../constants/players";
import { ui } from "../../styles/classNames";
import type { Player, Players, Side } from "../../types";
import { getTokenColors } from "../../utils/colors";
import { clubOf, sideLabel } from "../../utils/teams";

const GROUPS: { side: Side; players: Player[] }[] = [
  { side: "attack", players: ROSTER_ATTACK },
  { side: "defense", players: ROSTER_DEFENSE },
];

interface Props {
  players: Players;
  selectedId: string | null;
  swapColors: boolean;
  onSelect: (id: string | null) => void;
}

/** Totes les jugadores (també les ocultes) per seleccionar-les i restaurar-les. */
export function Bench({ players, selectedId, swapColors, onSelect }: Props) {
  return (
    <div className="p-3 flex-1 border-b border-[#1e2d42]">
      <div className={ui.sectionTitle}>Banqueta</div>

      {GROUPS.map(({ side, players: roster }) => {
        const label = `${sideLabel(side)} (${clubOf(side, swapColors)})`;
        return (
          <div key={side} className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-2 h-2 rounded-full border border-gray-500" style={{ background: getTokenColors(side, swapColors).fill }} />
              <span className="text-[13px] text-[#c5d0dc] font-display font-bold uppercase tracking-wider">{label}</span>
            </div>

            <div className="flex flex-wrap gap-1">
              {roster.map(p => {
                const colors = getTokenColors(p.team, swapColors);
                const hidden = players[p.id]?.isHidden;
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelect(selectedId === p.id ? null : p.id)}
                    title={`${label} ${p.display} (${p.label})`}
                    className={`flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-all border-2 ${
                      selectedId === p.id ? "ring-2 ring-[#00d4d4] ring-offset-2 ring-offset-[#0d1b2a]" : ""
                    } ${hidden ? "opacity-30 grayscale" : "hover:opacity-80"}`}
                    style={{ background: colors.fill, borderColor: colors.stroke }}
                  >
                    <span className="font-display font-bold text-xs" style={{ color: colors.text }}>
                      {p.display}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
