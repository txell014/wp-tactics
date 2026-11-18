export type Team = "attack" | "defense" | "attackKeeper" | "defenseKeeper";
export type Side = "attack" | "defense";
export type PoolView = "full" | "half";
export type AppMode = "animacio" | "pissarra";
export type ActionType = "turn" | "exclusion" | "block" | "fake";

export interface Pt {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  num: number;
  display: string;
  team: Team;
  label: string;
}

export interface PlayerPos extends Pt {
  angle: number;
  hasBall: boolean;
  isHidden?: boolean;
}

export type Players = Record<string, PlayerPos>;
export type BallPos = Pt;

export interface TacticalAction {
  type: ActionType;
  attackerId: string;
  /** Buit ("") per a la finta, que no necessita defensora. */
  defenderId: string;
}

export interface FrameData {
  id: string;
  label: string;
  players: Players;
  ball: BallPos;
  actions: TacticalAction[];
}

export interface ContextMenuState {
  id: string;
  other: string | null;
  x: number;
  y: number;
}

export interface TrailPoint extends Pt {
  t: number;
}

export interface LiveTrail {
  color: string;
  points: TrailPoint[];
}

export interface AnimationPath {
  id: string;
  d: string;
  color: string;
  isBall: boolean;
}

export interface ExportResolution {
  label: string;
  width: number;
  height: number;
}
