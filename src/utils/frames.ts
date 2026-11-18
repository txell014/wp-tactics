import { BALL_OFFSET, EXCLUSION_SPOT, EXCLUSION_STACK_GAP, PROXIMITY_RADIUS } from "../constants/pool";
import { DEFAULT_POSITIONS, PLAYER_BY_ID, sideOf } from "../constants/players";
import type { BallPos, FrameData, Players, Pt, TacticalAction } from "../types";
import { distance } from "./geometry";

export const uid = (prefix = "f") => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function clonePlayers(players: Players): Players {
  return Object.fromEntries(Object.entries(players).map(([id, p]) => [id, { ...p }]));
}

/** Posició de la pilota quan la porta la jugadora situada a `p`. */
export const ballNear = (p: Pt): BallPos => ({ x: p.x + BALL_OFFSET.x, y: p.y + BALL_OFFSET.y });

function defaultBall(): BallPos {
  const holder = Object.values(DEFAULT_POSITIONS).find(p => p.hasBall);
  return holder ? ballNear(holder) : { x: 0, y: 0 };
}

/** Assigna la pilota a l'atacant visible més proper; si ja és correcte retorna el mateix objecte. */
export function autoAssignBall(players: Players, ball: BallPos): Players {
  let closestId = "";
  let minDist = Infinity;

  for (const [id, p] of Object.entries(players)) {
    if (p.isHidden || PLAYER_BY_ID[id]?.team !== "attack") continue;
    const d = distance(p, ball);
    if (d < minDist) {
      minDist = d;
      closestId = id;
    }
  }

  if (Object.entries(players).every(([id, p]) => p.hasBall === (id === closestId))) return players;
  return Object.fromEntries(Object.entries(players).map(([id, p]) => [id, { ...p, hasBall: id === closestId }]));
}

/** Defensora (o jugadora) més propera de l'equip rival dins del radi de proximitat. */
export function findNearestOpponent(players: Players, id: string): string | null {
  const pos = players[id];
  if (!pos) return null;
  const opponentSide = sideOf(id) === "attack" ? "defense" : "attack";

  let nearest: string | null = null;
  let best = PROXIMITY_RADIUS;
  for (const [otherId, other] of Object.entries(players)) {
    if (other.isHidden || sideOf(otherId) !== opponentSide) continue;
    const d = distance(pos, other);
    if (d < best) {
      best = d;
      nearest = otherId;
    }
  }
  return nearest;
}

/** Gir: l'atacant i la defensora intercanvien posicions (muta `players` i `ball`, que són còpies locals). */
function applyTurns(players: Players, ball: BallPos, actions: TacticalAction[]) {
  const swapped = new Set<string>();
  for (const { type, attackerId, defenderId } of actions) {
    if (type !== "turn") continue;
    const att = players[attackerId];
    const def = players[defenderId];
    if (!att || !def || att.isHidden || def.isHidden) continue;
    // Una jugadora que ja ha canviat de lloc per un altre gir no es torna a moure
    if (swapped.has(attackerId) || swapped.has(defenderId)) continue;

    players[attackerId] = { ...att, x: def.x, y: def.y };
    players[defenderId] = { ...def, x: att.x, y: att.y };
    swapped.add(attackerId);
    swapped.add(defenderId);

    // La pilota viatja amb l'atacant que la porta
    if (att.hasBall) {
      ball.x += def.x - att.x;
      ball.y += def.y - att.y;
    }
  }
}

/** Les defensores expulsades passen a la zona d'expulsió (apilades si n'hi ha vàries). */
function applyExclusions(players: Players, actions: TacticalAction[]) {
  const excluded = Array.from(new Set(actions.filter(a => a.type === "exclusion").map(a => a.defenderId)));
  excluded.forEach((id, i) => {
    if (!players[id]) return;
    players[id] = { ...players[id], x: EXCLUSION_SPOT.x - i * EXCLUSION_STACK_GAP, y: EXCLUSION_SPOT.y };
  });
}

/** Crea un frame nou a partir de l'anterior, aplicant-ne els girs i les expulsions. */
export function makeFrame(id: string, label: string, prev?: FrameData): FrameData {
  const newPlayers = prev ? clonePlayers(prev.players) : clonePlayers(DEFAULT_POSITIONS);
  const newBall: BallPos = prev ? { ...prev.ball } : defaultBall();

  if (prev && prev.actions) {
    applyTurns(newPlayers, newBall, prev.actions);
    applyExclusions(newPlayers, prev.actions);
  }

  return {
    id,
    label,
    players: newPlayers,
    ball: newBall,
    actions: [],
  };
}

export const createInitialFrames = (): FrameData[] => [makeFrame("f1", "Posicions Inicials")];
