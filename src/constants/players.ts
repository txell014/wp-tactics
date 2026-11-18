import type { Player, Players, Side } from "../types";

export const ROSTER_ATTACK: Player[] = [
  { id: "aP", num: 13, team: "attackKeeper", label: "Portera", display: "P" },
  { id: "a1", num: 1, team: "attack", label: "Extrem Dret (1)", display: "1" },
  { id: "a2", num: 2, team: "attack", label: "Lateral Dret (2)", display: "2" },
  { id: "a3", num: 3, team: "attack", label: "Central (3)", display: "3" },
  { id: "a4", num: 4, team: "attack", label: "Lateral Esq. (4)", display: "4" },
  { id: "a5", num: 5, team: "attack", label: "Extrem Esq. (5)", display: "5" },
  { id: "aB", num: 6, team: "attack", label: "Boia (B)", display: "B" },
];

export const ROSTER_DEFENSE: Player[] = [
  { id: "dP", num: 13, team: "defenseKeeper", label: "Portera Def.", display: "P" },
  { id: "d1", num: 1, team: "defense", label: "Defensa (1)", display: "1" },
  { id: "d2", num: 2, team: "defense", label: "Defensa (2)", display: "2" },
  { id: "d3", num: 3, team: "defense", label: "Defensa Boia (3)", display: "3" },
  { id: "d4", num: 4, team: "defense", label: "Defensa (4)", display: "4" },
  { id: "d5", num: 5, team: "defense", label: "Defensa (5)", display: "5" },
  { id: "dB", num: 6, team: "defense", label: "Defensa Central (B)", display: "B" },
];

export const ALL_PLAYERS: Player[] = [...ROSTER_ATTACK, ...ROSTER_DEFENSE];
export const PLAYER_BY_ID: Record<string, Player> = Object.fromEntries(ALL_PLAYERS.map(p => [p.id, p]));

/** Equip (atac/defensa) al qual pertany un jugador, inclosa la portera, segons el seu id. */
export const sideOf = (id: string): Side => (id.startsWith("a") ? "attack" : "defense");

export const DEFAULT_POSITIONS: Players = {
  aP: { x: 35, y: 230, angle: 0, hasBall: false }, // Portera a la seva porta
  a1: { x: 725, y: 390, angle: 140, hasBall: false }, // Extrem dret
  a2: { x: 620, y: 320, angle: 160, hasBall: false }, // Lateral dret
  a3: { x: 570, y: 230, angle: 180, hasBall: true }, // Central, amb la pilota
  a4: { x: 620, y: 140, angle: 200, hasBall: false }, // Lateral esquerre
  a5: { x: 725, y: 70, angle: 220, hasBall: false }, // Extrem esquerre
  aB: { x: 720, y: 230, angle: 180, hasBall: false }, // Boia

  dP: { x: 765, y: 230, angle: 180, hasBall: false }, // Portera rival
  d5: { x: 723, y: 355, angle: 320, hasBall: false }, // Defensa d'a1
  d4: { x: 640, y: 300, angle: 340, hasBall: false }, // Defensa d'a2
  dB: { x: 600, y: 230, angle: 0, hasBall: false }, // Defensa d'a3
  d2: { x: 640, y: 160, angle: 20, hasBall: false }, // Defensa d'a4
  d1: { x: 723, y: 105, angle: 40, hasBall: false }, // Defensa d'a5
  d3: { x: 745, y: 230, angle: 180, hasBall: false }, // Defensa d'aB (boia)
};
