import { Hand, RefreshCw, Waves, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActionType } from "../types";
import { COLORS } from "./theme";

export const ACTION_META: Record<ActionType, { label: string; color: string; Icon: LucideIcon }> = {
  turn: { label: "Gir", color: COLORS.accent, Icon: RefreshCw },
  exclusion: { label: "Expulsió", color: COLORS.danger, Icon: Zap },
  block: { label: "Bloqueig", color: COLORS.warning, Icon: Hand },
  fake: { label: "Finta", color: COLORS.ball, Icon: Waves },
};

/** Accions entre dues jugadores, en l'ordre en què surten al menú contextual. */
export const PAIR_ACTIONS: ActionType[] = ["turn", "exclusion", "block"];
