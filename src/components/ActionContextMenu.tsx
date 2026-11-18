import { useEffect } from "react";
import { Check } from "lucide-react";
import { ACTION_META, PAIR_ACTIONS } from "../constants/actions";
import { PLAYER_BY_ID, sideOf } from "../constants/players";
import { ui } from "../styles/classNames";
import type { ActionType, ContextMenuState, FrameData } from "../types";

const MENU_W = 180;
const MENU_ITEM_H = 40;
const MENU_HEADER_H = 35;
const MENU_MARGIN = 8;

interface Props {
  menu: ContextMenuState;
  frame: FrameData;
  onToggle: (type: ActionType, attackerId: string, defenderId: string) => void;
  onClose: () => void;
}

/** Menú que apareix en clicar una jugadora propera a una rival (o amb pilota) per afegir accions tàctiques. */
export function ActionContextMenu({ menu, frame, onToggle, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Element && !e.target.closest("[data-context-menu]")) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  const clickedIsAttack = sideOf(menu.id) === "attack";
  const attackerId = clickedIsAttack ? menu.id : menu.other;
  const defenderId = clickedIsAttack ? menu.other : menu.id;
  const attacker = attackerId ? PLAYER_BY_ID[attackerId] : undefined;
  if (!attackerId || !attacker) return null;

  const defender = defenderId ? PLAYER_BY_ID[defenderId] : undefined;
  const items: { type: ActionType; defenderId: string }[] = [];
  if (defenderId && defender) PAIR_ACTIONS.forEach(type => items.push({ type, defenderId }));
  if (frame.players[attackerId]?.hasBall) items.push({ type: "fake", defenderId: "" });
  if (items.length === 0) return null;

  const height = items.length * MENU_ITEM_H + MENU_HEADER_H;
  const left = Math.max(MENU_MARGIN, Math.min(menu.x + 8, window.innerWidth - MENU_W - MENU_MARGIN));
  const top = Math.max(MENU_MARGIN, Math.min(menu.y + 8, window.innerHeight - height - MENU_MARGIN));
  const title = defender ? `${attacker.display} → ${defender.display}` : attacker.label;

  return (
    <div data-context-menu className={`fixed z-50 overflow-hidden ${ui.dropdown}`} style={{ left, top, width: MENU_W }}>
      <div className={`${ui.dropdownHeader} truncate`}>{title}</div>

      {items.map(({ type, defenderId: d }) => {
        const { label, color, Icon } = ACTION_META[type];
        const active = frame.actions.some(a => a.type === type && a.attackerId === attackerId && a.defenderId === d);
        return (
          <button
            key={type}
            type="button"
            onClick={() => {
              onToggle(type, attackerId, d);
              onClose();
            }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors hover:bg-[#243050] ${active ? "text-[#f0f4f8]" : "text-[#c5d0dc]"}`}
          >
            <Icon size={14} style={{ color }} />
            <span className="flex-1">{label}</span>
            {active && (
              <span className="ml-auto flex items-center gap-1 text-[12px] font-mono" style={{ color }}>
                ACTIVA
                <Check size={12} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
