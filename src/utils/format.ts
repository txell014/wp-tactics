export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
}

/** Nom de fitxer segur a partir del títol de la jugada. */
export function sanitizeFileName(name: string, fallback = "jugada"): string {
  return name.trim().replace(/[\\/:*?"<>|\s]+/g, "_") || fallback;
}
