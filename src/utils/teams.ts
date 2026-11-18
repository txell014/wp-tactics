import type { Side } from "../types";

export type Club = "Local" | "Visitant";

/** Club d'un equip: per defecte l'atac és el Local; amb els colors intercanviats, el Visitant. */
export const clubOf = (side: Side, swapColors: boolean): Club =>
  (side === "attack") !== swapColors ? "Local" : "Visitant";

/** Equip (atac/defensa) que correspon a cada club. */
export const sideOfClub = (club: Club, swapColors: boolean): Side =>
  (club === "Local") !== swapColors ? "attack" : "defense";

export const sideLabel = (side: Side, short = false) =>
  side === "attack" ? "Atac" : short ? "Def" : "Defensa";
