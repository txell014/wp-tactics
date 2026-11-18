import { COLORS } from "../constants/theme";
import type { Team } from "../types";

export interface TokenColors {
  fill: string;
  stroke: string;
  text: string;
}

/** Colors d'una fitxa segons l'equip i si s'han intercanviat els colors Local/Visitant. */
export function getTokenColors(team: Team, swapColors: boolean): TokenColors {
  const isLight = (team === "attack" || team === "attackKeeper") !== swapColors;
  if (team === "defenseKeeper" || team === "attackKeeper") {
    return isLight ? COLORS.lightKeeper : COLORS.darkKeeper;
  }
  return isLight ? COLORS.teamLight : COLORS.teamDark;
}
