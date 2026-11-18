import type { AppMode, PoolView } from "../types";

export const DEFAULT_PLAY_TITLE = "Local vs Visitant - Jugada 1";
export const DEFAULT_APP_MODE: AppMode = "pissarra";

export const MODES: { mode: AppMode; label: string }[] = [
  { mode: "pissarra", label: "Pissarra" },
  { mode: "animacio", label: "Animació" },
];

export const CAMP: { mode: PoolView; label: string }[] = [
  { mode: "full", label: "Completa" },
  { mode: "half", label: "Mig camp" },
];
