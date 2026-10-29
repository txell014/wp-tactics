import { useState, useRef, useEffect, useCallback, memo } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { RotateCcw, Zap, Pencil, Pointer, EyeOff, Eye, Palette, Map as MapIcon, RefreshCw, Hand, Waves, Play, Pause, Square, Repeat, Download, Route, X, Plus, Check, Circle } from "lucide-react"; 

// ─── Types ────────────────────────────────────────────────────────────────────

type Team = "attack" | "defense" | "keeper";

interface Player {
  id: string;
  num: number; 
  display: string; 
  team: Team;
  label: string;
}

interface PlayerPos {
  x: number;
  y: number;
  angle: number;
  hasBall: boolean;
  isHidden?: boolean; // Propietat per ocultar la jugadora
}

interface BallPos {
  x: number;
  y: number;
}

type ActionType = "turn" | "exclusion" | "block" | "fake"; // Finta/Amenaçar

interface TacticalAction {
  type: ActionType;
  attackerId: string;
  defenderId: string; // buit ("") per a la finta, que no necessita defensora
}

interface FrameData {
  id: string;
  label: string;
  players: Record<string, PlayerPos>;
  ball: BallPos;
  actions: TacticalAction[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

interface ContextMenuState {
  id: string;
  other: string | null;
  x: number;
  y: number;
}

interface TrailPoint { x: number; y: number; t: number }
interface LiveTrail { color: string; points: TrailPoint[] }
interface Pt { x: number; y: number }

const POOL_W = 800;
const POOL_H = 460;

type PoolView = "full" | "half";
const VIEW_DIMS: Record<PoolView, { w: number; h: number }> = {
  full: { w: POOL_W, h: POOL_H },
  half: { w: POOL_H, h: POOL_W / 2 },
};

const ROSTER_ATTACK: Player[] = [
  { id: "aP", num: 13, team: "keeper", label: "Portera", display: "P" },
  { id: "a1", num: 1, team: "attack", label: "Extrem Dret (1)", display: "1" },
  { id: "a2", num: 2, team: "attack", label: "Lateral Dret (2)", display: "2" },
  { id: "a3", num: 3, team: "attack", label: "Central (3)", display: "3" },
  { id: "a4", num: 4, team: "attack", label: "Lateral Esq. (4)", display: "4" },
  { id: "a5", num: 5, team: "attack", label: "Extrem Esq. (5)", display: "5" },
  { id: "aB", num: 6, team: "attack", label: "Boia (B)", display: "B" },
];

const ROSTER_DEFENSE: Player[] = [
  { id: "dP", num: 13, team: "keeper", label: "Portera Def.", display: "P" },
  { id: "d1", num: 1, team: "defense", label: "Defensa (1)", display: "1" },
  { id: "d2", num: 2, team: "defense", label: "Defensa (2)", display: "2" },
  { id: "d3", num: 3, team: "defense", label: "Defensa Boia (3)", display: "3" },
  { id: "d4", num: 4, team: "defense", label: "Defensa (4)", display: "4" },
  { id: "d5", num: 5, team: "defense", label: "Defensa (5)", display: "5" },
  { id: "dB", num: 6, team: "defense", label: "Defensa Central (B)", display: "B" },
];

const ALL_PLAYERS: Player[] = [...ROSTER_ATTACK, ...ROSTER_DEFENSE];
const PLAYER_BY_ID: Record<string, Player> = Object.fromEntries(ALL_PLAYERS.map(p => [p.id, p]));

const EXCLUSION_SPOT = { x: 770, y: 30 }; // cantonada superior dreta (zona d'expulsió)
const TRAIL_LIFETIME_MS = 2000;
const PATH_CURVE = 0.3; // curvatura de les trajectòries de jugadores
const BALL_CURVE = 0.4; // curvatura de les passades
const FAKE_OFFSET = { x: 0, y: 12 }; // la pilota va de (x,y) a (x+dx, y+dy) i torna
const FAKE_CYCLES = 1;

const BALL_COLOR = "#ffd92e";
const BALL_STROKE = "#c99a00";
const BALL_GLOW = "rgba(255,217,46,0.2)";

const ACTION_META: Record<ActionType, { label: string; color: string; Icon: LucideIcon }> = {
  turn:      { label: "Gir",      color: "#00d4d4", Icon: RefreshCw },
  exclusion: { label: "Expulsió", color: "#e74c3c", Icon: Zap },
  block:     { label: "Bloqueig", color: "#f0c040", Icon: Hand },
  fake:      { label: "Finta",    color: BALL_COLOR, Icon: Waves },
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Colors d'una fitxa segons l'equip i si s'han intercanviat els colors. */
function getTokenColors(team: Team, swapColors: boolean) {
  if (team === "keeper") return { fill: "#e74c3c", stroke: "#c0392b", text: "#ffffff" };
  const isWhite = (team === "attack") !== swapColors;
  return isWhite
    ? { fill: "#ffffff", stroke: "#cccccc", text: "#1a3a6b" }
    : { fill: "#1a3a6b", stroke: "#0a1525", text: "#ffffff" };
}

/** Punt de control d'una corba perpendicular al segment p0→p2. */
function controlPoint(p0: Pt, p2: Pt, curve: number): Pt {
  return {
    x: (p0.x + p2.x) / 2 + (p2.y - p0.y) * curve,
    y: (p0.y + p2.y) / 2 - (p2.x - p0.x) * curve,
  };
}

/** Tram [0,t] d'una Bézier quadràtica: punt actual i punt de control del tram. */
function quadAt(p0: Pt, p1: Pt, p2: Pt, t: number) {
  const a = { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
  const b = { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t };
  return { control: a, point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t } };
}

const quadPath = (from: Pt, control: Pt, to: Pt) => `M${from.x},${from.y} Q${control.x},${control.y} ${to.x},${to.y}`;
const staticCurvePath = (from: Pt, to: Pt, curve: number) => quadPath(from, controlPoint(from, to, curve), to);
const hasMoved = (a: Pt, b: Pt) => Math.abs(a.x - b.x) >= 5 || Math.abs(a.y - b.y) >= 5;

function autoAssignBall(players: Record<string, PlayerPos>, ball: BallPos) {
  let closestId = "";
  let minDist = Infinity;
  for (const [id, p] of Object.entries(players)) {
    // No s'assigna la pilota a jugadores ocultes
    if (!p.isHidden && PLAYER_BY_ID[id]?.team === "attack") {
      const d = Math.hypot(p.x - ball.x, p.y - ball.y);
      if (d < minDist) { minDist = d; closestId = id; }
    }
  }
  if (Object.entries(players).every(([id, p]) => p.hasBall === (id === closestId))) return players;
  const updated = { ...players };
  for (const id of Object.keys(updated)) {
    updated[id] = { ...updated[id], hasBall: id === closestId };
  }
  return updated;
}

function makeDefaultPositions(): Record<string, PlayerPos> {
  return {
    aP: { x: 40, y: 230, angle: 0, hasBall: false, isHidden: false },
    a1: { x: 730, y: 400, angle: 140, hasBall: false, isHidden: false },
    a2: { x: 620, y: 350, angle: 160, hasBall: false, isHidden: false },
    a3: { x: 550, y: 230, angle: 180, hasBall: true, isHidden: false }, 
    a4: { x: 620, y: 110, angle: 200, hasBall: false, isHidden: false },
    a5: { x: 730, y: 60, angle: 220, hasBall: false, isHidden: false },
    aB: { x: 710, y: 230, angle: 180, hasBall: false, isHidden: false },
    
    dP: { x: 760, y: 230, angle: 180, hasBall: false, isHidden: false },
    d5: { x: 700, y: 380, angle: 320, hasBall: false, isHidden: false },
    d4: { x: 650, y: 320, angle: 340, hasBall: false, isHidden: false },
    dB: { x: 580, y: 230, angle: 0, hasBall: false, isHidden: false },
    d2: { x: 650, y: 140, angle: 20, hasBall: false, isHidden: false },
    d1: { x: 700, y: 80, angle: 40, hasBall: false, isHidden: false },
    d3: { x: 735, y: 230, angle: 180, hasBall: false, isHidden: false },
  };
}

function clonePlayers(players: Record<string, PlayerPos>): Record<string, PlayerPos> {
  return Object.fromEntries(Object.entries(players).map(([id, p]) => [id, { ...p }]));
}

function makeFrame(id: string, label: string, prev?: FrameData): FrameData {
  const players = prev ? clonePlayers(prev.players) : makeDefaultPositions();
  const ball = prev ? { ...prev.ball } : { x: 562, y: 242 };

  // Gir: l'atacant i la defensora intercanvien posicions al frame següent
  const swapped = new Set<string>();
  (prev?.actions ?? [])
    .filter(a => a.type === "turn")
    .forEach(({ attackerId, defenderId }) => {
      const att = players[attackerId];
      const def = players[defenderId];
      // Si una jugadora ja ha canviat de lloc per un altre gir, no es torna a moure
      if (!att || !def || swapped.has(attackerId) || swapped.has(defenderId)) return;

      players[attackerId] = { ...att, x: def.x, y: def.y };
      players[defenderId] = { ...def, x: att.x, y: att.y };
      swapped.add(attackerId).add(defenderId);

      // Si l'atacant portava la pilota, aquesta es mou amb ell
      if (att.hasBall) {
        ball.x += def.x - att.x;
        ball.y += def.y - att.y;
      }
    });

  // Les defensores expulsades al frame anterior passen a la zona d'expulsió (apilades si n'hi ha vàries)
  const excluded = Array.from(new Set((prev?.actions ?? []).filter(a => a.type === "exclusion").map(a => a.defenderId)));
  excluded.forEach((defId, i) => {
    if (!players[defId]) return;
    players[defId] = { ...players[defId], x: EXCLUSION_SPOT.x - i * 32, y: EXCLUSION_SPOT.y };
  });

  return { id, label, players, ball, actions: [] };
}

const INITIAL_FRAMES: FrameData[] = [
  makeFrame("f1", "Posicions Inicials")
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const PlayerTokenSVG = memo(function PlayerTokenSVG({
  player,
  pos,
  selected,
  swapColors,
  rot = 0,
}: {
  player: Player;
  pos: PlayerPos;
  selected: boolean;
  swapColors: boolean;
  rot?: number;
}) {
  const colors = getTokenColors(player.team, swapColors);
  const stroke = selected ? "#00d4d4" : player.team === "keeper" ? "none" : colors.stroke;

  return (
    <g transform={`translate(${pos.x},${pos.y}) rotate(${rot})`} style={{ cursor: "grab" }}>
      {selected && (
        <circle r={24} fill="none" stroke="#00d4d4" strokeWidth={2} strokeDasharray="4 3" opacity={0.8} />
      )}
      <circle r={15} fill="rgba(0,0,0,0.3)" cx={1} cy={2} />
      <circle r={15} fill={colors.fill} stroke={stroke} strokeWidth={selected ? 2.5 : 1.5} />
      <text textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="800" fontFamily="Barlow Condensed,sans-serif" fill={colors.text} y={1}>
        {player.display}
      </text>
      {/* Indicador de pilota (si la vista està girada, es mostra a l'altre costat) */}
      {pos.hasBall && (
        <circle r={5} cx={12} cy={rot === 90 ? -12 : 12} fill={BALL_COLOR} stroke="#0a0f1e" strokeWidth={1.5} />
      )}
    </g>
  );
});

function ActionsLayer({ actions, players, rot = 0, hideFake = false }: { actions: TacticalAction[]; players: Record<string, PlayerPos>; rot?: number; hideFake?: boolean }) {
  return (
    <g style={{ pointerEvents: "none" }}>
      {actions.map(a => {
        const att = players[a.attackerId];
        const def = players[a.defenderId];
        if (!att || att.isHidden) return null;

        const key = `${a.type}-${a.attackerId}-${a.defenderId}`;
        
        // ── Amenaçar Finta ──
        if (a.type === "fake") {
          // Només es veu amb la pilota a la mà i amb l'animació aturada (ni en reproducció ni en exportar)
          if (hideFake || !att.hasBall) return null;
          return (
            <g key={key} transform={`translate(${att.x + 20}, ${att.y - 20}) rotate(${rot})`}>
              <circle r={11} fill="#111827" stroke={BALL_COLOR} strokeWidth={1.5} />
              <Waves x={-7} y={-7} size={14} color={BALL_COLOR} strokeWidth={2.5} />
            </g>
          );
        }

        // La resta d'accions necessiten una defensora visible
        if (!def || def.isHidden) return null;

        const dx = def.x - att.x;
        const dy = def.y - att.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const x1 = att.x + ux * 17, y1 = att.y + uy * 17;
        const x2 = def.x - ux * 17, y2 = def.y - uy * 17;
        const hasLine = len > 36;

        if (a.type === "block") {
          const mx = (att.x + def.x) / 2;
          const my = (att.y + def.y) / 2;
          return (
            <g key={key}>
              {hasLine && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f0c040" strokeWidth={4} strokeLinecap="round" />}
              <circle cx={mx} cy={my} r={9} fill="#111827" stroke="#f0c040" strokeWidth={1.5} />
              <g transform={`rotate(${rot} ${mx} ${my})`}>
                <Hand x={mx - 6} y={my - 6} size={12} color="#f0c040" strokeWidth={2.5} />
              </g>
            </g>
          );
        }

        if (a.type === "exclusion") {
          return (
            <g key={key}>
              <circle cx={def.x} cy={def.y} r={15} fill="rgba(231,76,60,0.45)" />
              <circle cx={def.x} cy={def.y} r={22} fill="none" stroke="#e74c3c" strokeWidth={2}>
                <animate attributeName="r" values="20;27;20" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.2s" repeatCount="indefinite" />
              </circle>
              {(() => {
                const lx = rot ? def.x + 33 : def.x;
                const ly = rot ? def.y : def.y - 33;
                return (
                  <g transform={`rotate(${rot} ${lx} ${ly})`}>
                    <rect x={lx - 20} y={ly - 9} width={40} height={18} rx={9} fill="#e74c3c" />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="800" fill="#fff" fontFamily="Inter,sans-serif">EXP</text>
                  </g>
                );
              })()}
            </g>
          );
        }

        // ── Gir ──
        const r = 27;
        const a0 = (-150 * Math.PI) / 180;
        const a1 = (100 * Math.PI) / 180;
        const sx = def.x + r * Math.cos(a0), sy = def.y + r * Math.sin(a0);
        const ex = def.x + r * Math.cos(a1), ey = def.y + r * Math.sin(a1);
        const tx = -Math.sin(a1), ty = Math.cos(a1);
        const nx = Math.cos(a1), ny = Math.sin(a1);
        const tip = `${ex + tx * 8},${ey + ty * 8}`;
        const b1 = `${ex + nx * 5},${ey + ny * 5}`;
        const b2 = `${ex - nx * 5},${ey - ny * 5}`;
        return (
          <g key={key}>
            {hasLine && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00d4d4" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />}
            <path d={`M${sx},${sy} A${r},${r} 0 1 1 ${ex},${ey}`} fill="none" stroke="#00d4d4" strokeWidth={3} strokeLinecap="round" />
            <polygon points={`${tip} ${b1} ${b2}`} fill="#00d4d4" />
          </g>
        );
      })}
    </g>
  );
}

function createSmoothPath(points: TrailPoint[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q${points[i].x},${points[i].y} ${xc},${yc}`;
  }
  d += ` L${points[points.length - 1].x},${points[points.length - 1].y}`;
  return d;
}

function PoolCanvas({
  frames,
  activeFrame,
  selectedId,
  onSelectPlayer,
  onMovePlayer,
  onMoveBall,
  showPaths,
  onContextMenu,
  onCloseContext,
  view,
  appMode,
  elapsed,
  frameDuration,
  showLegend,
  swapColors,
  hideFakeIcons
}: {
  view: PoolView;
  frames: FrameData[];
  activeFrame: number;
  selectedId: string | null;
  onSelectPlayer: (id: string | null) => void;
  onMovePlayer: (id: string, x: number, y: number) => void;
  onMoveBall: (x: number, y: number) => void;
  showPaths: boolean;
  onContextMenu: (id: string, other: string | null, x: number, y: number) => void;
  onCloseContext: () => void;
  appMode: "animació" | "pissarra";
  elapsed: number;
  frameDuration: number;
  showLegend: boolean;
  swapColors: boolean;
  hideFakeIcons: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<{ id: string; type: "player" | "ball"; ox: number; oy: number; startX: number; startY: number; moved: boolean; wasSelected: boolean; color: string } | null>(null);
  const [liveTrails, setLiveTrails] = useState<Record<string, LiveTrail>>({});

  const frame = frames[activeFrame];

  function toSVGCoords(e: ReactPointerEvent | PointerEvent) {
    const rect = svgRef.current!.getBoundingClientRect();
    const { w, h } = VIEW_DIMS[view];
    const vx = (e.clientX - rect.left) * (w / rect.width);
    const vy = (e.clientY - rect.top) * (h / rect.height);
    return view === "half" ? { x: POOL_W - vy, y: vx } : { x: vx, y: vy };
  }

  function checkProximity(id: string, clientX: number, clientY: number) {
    const pos = frame.players[id];
    if (!pos) return;
    const opponentPrefix = id.startsWith("a") ? "d" : "a";
    let nearest: string | null = null;
    let best = 80;
    for (const [oid, op] of Object.entries(frame.players)) {
      if (!oid.startsWith(opponentPrefix) || op.isHidden) continue;
      const dist = Math.hypot(pos.x - op.x, pos.y - op.y);
      if (dist < best) { best = dist; nearest = oid; }
    }
    if (nearest || pos.hasBall) onContextMenu(id, nearest, clientX, clientY);
  }

  function onPointerDownBase(e: ReactPointerEvent, id: string, type: "player" | "ball") {
    if (e.button !== 0) return; // només botó principal / tàctil
    e.stopPropagation();
    onCloseContext();
    onSelectPlayer(type === "player" ? id : null);

    const { x, y } = toSVGCoords(e);
    const pos = type === "ball" ? frame.ball : frame.players[id];
    const color = type === "ball" ? BALL_COLOR : getTokenColors(PLAYER_BY_ID[id].team, swapColors).fill;
    draggingRef.current = { id, type, ox: x - pos.x, oy: y - pos.y, startX: e.clientX, startY: e.clientY, moved: false, wasSelected: selectedId === id, color };

    if (appMode === "pissarra") {
      setLiveTrails(prev => ({ ...prev, [id]: { color, points: [{ x: pos.x, y: pos.y, t: Date.now() }] } }));
    }
  }

  function onMove(e: PointerEvent) {
    const drag = draggingRef.current;
    if (!drag || !svgRef.current) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 3) drag.moved = true;

    const { x, y } = toSVGCoords(e);
    const minX = view === "half" ? POOL_W - VIEW_DIMS.half.h + 15 : 15;
    const nx = clamp(x - drag.ox, minX, POOL_W - 15);
    const ny = clamp(y - drag.oy, 15, POOL_H - 15);

    if (drag.type === "ball") onMoveBall(nx, ny);
    else onMovePlayer(drag.id, nx, ny);

    if (drag.moved && appMode === "pissarra") {
      const now = Date.now();
      setLiveTrails(prev => {
        // Si la cua s'ha esvaït durant una pausa, es torna a crear
        const current = prev[drag.id] ?? { color: drag.color, points: [] };
        const last = current.points[current.points.length - 1];
        if (last && Math.hypot(nx - last.x, ny - last.y) <= 5) return prev;
        return { ...prev, [drag.id]: { ...current, points: [...current.points, { x: nx, y: ny, t: now }] } };
      });
    }
  }

  function onUp(e: PointerEvent) {
    const drag = draggingRef.current;
    if (!drag) return;
    draggingRef.current = null;
    if (drag.type === "player") {
      if (drag.moved || drag.wasSelected) onSelectPlayer(null);
      else checkProximity(drag.id, e.clientX, e.clientY);
    } else if (!drag.moved) {
      onSelectPlayer(null);
    }
  }

  // Els listeners es registren una sola vegada; sempre criden la darrera versió dels handlers
  const handlersRef = useRef({ onMove, onUp });
  handlersRef.current = { onMove, onUp };
  useEffect(() => {
    const move = (e: PointerEvent) => handlersRef.current.onMove(e);
    const up = (e: PointerEvent) => handlersRef.current.onUp(e);
    window.addEventListener("pointermove", move);
    const cancel = () => { draggingRef.current = null; };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, []);

  // Esvaïment de les cues de la pissarra
  useEffect(() => {
    if (appMode !== "pissarra") return;
    const timer = setInterval(() => {
      const now = Date.now();
      setLiveTrails(prev => {
        let changed = false;
        const next: Record<string, LiveTrail> = {};
        for (const id in prev) {
          const trail = prev[id];
          const points = trail.points.filter(p => now - p.t < TRAIL_LIFETIME_MS);
          if (points.length !== trail.points.length) changed = true;
          if (points.length > 0) next[id] = points.length === trail.points.length ? trail : { ...trail, points };
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [appMode]);

  // ─── Interpolació i animació ───
  const nextIdx = Math.min(frames.length - 1, activeFrame + 1);
  const startFrame = frame;
  const endFrame = frames[nextIdx];

  let t = 0;
  if (appMode === "animació" && frameDuration > 0) {
    t = clamp((elapsed - activeFrame * frameDuration) / frameDuration, 0, 1);
  }

  const renderPlayers = { ...startFrame.players };
  let renderBall = { ...startFrame.ball };
  const animationPaths: { id: string; d: string; color: string; isBall: boolean }[] = [];

  // 1. Interpolació de les jugadores cap al frame següent
  if (t > 0 && activeFrame !== nextIdx) {
    for (const id in renderPlayers) {
      const p0 = startFrame.players[id];
      const p2 = endFrame.players[id];
      if (!p0 || !p2 || p0.isHidden) continue;
      if (Math.hypot(p2.x - p0.x, p2.y - p0.y) < 5) continue;

      const { control, point } = quadAt(p0, controlPoint(p0, p2, PATH_CURVE), p2, t);
      renderPlayers[id] = { ...p0, x: point.x, y: point.y };
      if (showPaths) {
        animationPaths.push({ id, d: quadPath(p0, control, point), color: getTokenColors(PLAYER_BY_ID[id].team, swapColors).fill, isBall: false });
      }
    }
  }

  // 2. Pilota: passada o finta
  const b0 = startFrame.ball;
  const b2 = endFrame.ball;
  const isPassing = activeFrame !== nextIdx && Math.hypot(b2.x - b0.x, b2.y - b0.y) >= 5;

  if (isPassing && t > 0) {
    const { control, point } = quadAt(b0, controlPoint(b0, b2, BALL_CURVE), b2, t);
    renderBall = { x: point.x, y: point.y };
    if (showPaths) animationPaths.push({ id: "ball", d: quadPath(b0, control, point), color: BALL_COLOR, isBall: true });
  } else if (t > 0) {
    const holderId = Object.keys(startFrame.players).find(id => startFrame.players[id].hasBall);
    if (holderId && startFrame.actions.some(a => a.type === "fake" && a.attackerId === holderId)) {
      const wave = (1 - Math.cos(t * Math.PI * 2 * FAKE_CYCLES)) / 2; // 0 → 1 → 0, mai negatiu
      renderBall.x = b0.x + FAKE_OFFSET.x * wave;
      renderBall.y = b0.y + FAKE_OFFSET.y * wave;
    }
  }

  const lineColor = "rgba(255,255,255,0.5)";
  const prevFrame = activeFrame > 0 ? frames[activeFrame - 1] : undefined;

  return (
    <div className="relative w-full h-full" onPointerDown={() => { onSelectPlayer(null); onCloseContext(); }}>
      <svg id="pool-svg" ref={svgRef} viewBox={`0 0 ${VIEW_DIMS[view].w} ${VIEW_DIMS[view].h}`} className="w-full h-full" style={{ display: "block", touchAction: "none" }}>
        <defs>
          <linearGradient id="poolGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#07699b" />
            <stop offset="50%" stopColor="#0077b6" />
            <stop offset="100%" stopColor="#0b6694" />
          </linearGradient>
          <filter id="ballGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="tokenShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>

        <g transform={view === "half" ? `matrix(0 -1 1 0 0 ${POOL_W})` : undefined}>
          <rect x={0} y={0} width={POOL_W} height={POOL_H} fill="url(#poolGrad)" rx={4} />

          <rect x={20} y={20} width={POOL_W - 40} height={POOL_H - 40} fill="none" stroke={lineColor} strokeWidth={2} />
          <line x1={POOL_W / 2} y1={20} x2={POOL_W / 2} y2={POOL_H - 20} stroke="rgba(255,255,255,0.7)" strokeWidth={2} />

          {[20 + (POOL_W - 40) * (5 / 30), POOL_W - 20 - (POOL_W - 40) * (5 / 30)].map((x, i) => (
            <line key={i} x1={x} y1={20} x2={x} y2={POOL_H - 20} stroke="#f59e0b" strokeWidth={1.5} opacity={0.8} />
          ))}
          {[20 + (POOL_W - 40) * (6 / 30), POOL_W - 20 - (POOL_W - 40) * (6 / 30)].map((x, i) => (
            <line key={i} x1={x} y1={20} x2={x} y2={POOL_H - 20} stroke="#84cc16" strokeWidth={1.5} opacity={0.8} />
          ))}
          {[20 + (POOL_W - 40) * (2 / 30), POOL_W - 20 - (POOL_W - 40) * (2 / 30)].map((x, i) => (
            <line key={i} x1={x} y1={20} x2={x} y2={POOL_H - 20} stroke="#e74c3c" strokeWidth={1.5} opacity={0.8} />
          ))}

          {[20, POOL_W - 20].map((gx, i) => {
            const goalY1 = POOL_H / 2 - 35;
            const goalY2 = POOL_H / 2 + 35;
            return (
              <g key={i}>
                <rect x={i === 0 ? gx - 2 : gx - 6} y={goalY1} width={8} height={70} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5} />
                {[0, 14, 28, 42, 56, 70].map(dy => (
                  <line key={dy} x1={i === 0 ? gx - 2 : gx - 6} y1={goalY1 + dy} x2={i === 0 ? gx + 6 : gx + 2} y2={goalY1 + dy} stroke="rgba(255,255,255,0.25)" strokeWidth={0.5} />
                ))}
                {[0, 4].map(dx => (
                  <line key={dx} x1={i === 0 ? gx - 2 + dx * 2 : gx - 6 + dx * 2} y1={goalY1} x2={i === 0 ? gx - 2 + dx * 2 : gx - 6 + dx * 2} y2={goalY2} stroke="rgba(255,255,255,0.25)" strokeWidth={0.5} />
                ))}
                <circle r={3} cx={i === 0 ? gx + 6 : gx - 6} cy={goalY1} fill="#fff" opacity={0.9} />
                <circle r={3} cx={i === 0 ? gx + 6 : gx - 6} cy={goalY2} fill="#fff" opacity={0.9} />
              </g>
            );
          })}
          
          {view === "full" && <text x={POOL_W / 2} y={15} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.4)" fontFamily="JetBrains Mono">MIG CAMP</text>}

          {/* LÍNIES D'EDICIÓ ESTÀTIQUES: Sempre visibles si showPaths està actiu i reflecteixen la posició prèvia */}
          {appMode === "pissarra" && showPaths && prevFrame && Object.entries(frame.players).map(([id, cur]) => {
            const prev = prevFrame.players[id];
            if (!prev || cur.isHidden || prev.isHidden || !hasMoved(prev, cur)) return null;
            return (
              <path key={id} d={staticCurvePath(prev, cur, PATH_CURVE)} fill="none" stroke={getTokenColors(PLAYER_BY_ID[id].team, swapColors).fill} strokeWidth={1.5} opacity={0.5} className="motion-path" />
            );
          })}

          {appMode === "pissarra" && showPaths && prevFrame && hasMoved(prevFrame.ball, frame.ball) && (
            <path d={staticCurvePath(prevFrame.ball, frame.ball, BALL_CURVE)} fill="none" stroke={BALL_COLOR} strokeWidth={2} opacity={0.6} className="motion-path" />
          )}

          {/* LÍNIES TEMPORALS D'ANIMACIÓ FLUIDA */}
          {appMode === "animació" && t > 0 && animationPaths.map(path => (
            <path key={path.id} d={path.d} fill="none" stroke={path.color} strokeWidth={path.isBall ? 2 : 1.5} opacity={path.isBall ? 0.8 : 0.6} strokeDasharray="4 3" className="motion-path" />
          ))}

          {/* LÍNIES TEMPORALS PISSARRA (CUA DE SERP QUE S'ESVAEIX) */}
          {appMode === "pissarra" && Object.entries(liveTrails).map(([id, trail]) => {
            return (
              <path key={id} d={createSmoothPath(trail.points)} fill="none" stroke={trail.color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 8" opacity={0.7} />
            );
          })}
          
          {ALL_PLAYERS.map(player => {
            const pos = renderPlayers[player.id];
            if (!pos || pos.isHidden) return null;
            if (view === "half" && pos.x < POOL_W - VIEW_DIMS.half.h) return null;
            return (
              <g key={player.id} filter="url(#tokenShadow)" onPointerDown={e => { onPointerDownBase(e, player.id, "player"); }} className="player-token">
                <PlayerTokenSVG player={player} pos={pos} selected={selectedId === player.id} swapColors={swapColors} rot={view === "half" ? 90 : 0} />
              </g>
            );
          })}
          
          <ActionsLayer actions={startFrame.actions} players={renderPlayers} rot={view === "half" ? 90 : 0} hideFake={hideFakeIcons} />
          
          <g filter="url(#ballGlow)" onPointerDown={e => { onPointerDownBase(e, "ball", "ball"); }} style={{ cursor: "grab" }}>
            <circle r={10} cx={renderBall.x} cy={renderBall.y} fill={BALL_GLOW} />
            <circle r={9} cx={renderBall.x} cy={renderBall.y} fill={BALL_COLOR} />
            <circle r={9} cx={renderBall.x} cy={renderBall.y} fill="none" stroke={BALL_STROKE} strokeWidth={1.5} />
            <circle r={3} cx={renderBall.x - 3} cy={renderBall.y - 4} fill="rgba(255,255,255,0.4)" />
          </g>
        </g>

        {showLegend && (() => {
          const scale = view === "half" ? 0.75 : 1;
          const w = 160 * scale;
          const h = 78 * scale;
          
          const x = view === "half" ? VIEW_DIMS[view].w - w - 15 : (VIEW_DIMS[view].w - w) / 2;
          const y = view === "half" ? VIEW_DIMS[view].h - h - 15 : VIEW_DIMS[view].h - 92;

          return (
            <g transform={`translate(${x}, ${y}) scale(${scale})`}>
              <rect x={0} y={0} width={160} height={78} rx={4} fill="rgba(10,15,30,0.7)" />
              {[
                { color: "#ffffff", label: swapColors ? "Equip Local (Def)" : "Equip Local (Atac)", stroke: "#ccc" },
                { color: "#1a3a6b", label: swapColors ? "Equip Visitant (Atac)" : "Equip Visitant (Def)", stroke: "none" },
                { color: "#e74c3c", label: "Portera", stroke: "none" },
              ].map(({ color, label, stroke }, i) => (
                <g key={label} transform={`translate(10, ${i * 23 + 15})`}>
                  <circle r={6} cx={6} cy={0} fill={color} stroke={stroke} />
                  <text x={20} y={4.5} fontSize={12.5} fill="rgba(255,255,255,0.8)" fontFamily="Inter,sans-serif">{label}</text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toFixed(1).padStart(4, "0");
  return `${m}:${sec}`;
}

const FrameThumbnail = memo(function FrameThumbnail({ frame, swapColors }: { frame: FrameData; swapColors: boolean }) {
  return (
    <svg viewBox="0 0 100 58" width="100%" height="100%">
      <rect width={100} height={58} fill="#0b2a4a" />
      <line x1={50} y1={2} x2={50} y2={56} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
      <rect x={2} y={2} width={96} height={54} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
      <rect x={0} y={22} width={3} height={14} fill="rgba(255,255,255,0.5)" />
      <rect x={97} y={22} width={3} height={14} fill="rgba(255,255,255,0.5)" />
      {Object.entries(frame.players).map(([id, pos]) => {
        if (pos.isHidden) return null;
        return <circle key={id} cx={pos.x * 100 / POOL_W} cy={pos.y * 58 / POOL_H} r={3} fill={getTokenColors(PLAYER_BY_ID[id].team, swapColors).fill} />;
      })}
      <circle cx={frame.ball.x * 100 / POOL_W} cy={frame.ball.y * 58 / POOL_H} r={2.5} fill={BALL_COLOR} />
    </svg>
  );
});

/** Menú que apareix en clicar una jugadora propera a una rival (o amb pilota) per afegir accions tàctiques. */
function ActionContextMenu({
  menu,
  frame,
  onToggle,
  onClose,
}: {
  menu: ContextMenuState;
  frame: FrameData;
  onToggle: (type: ActionType, attackerId: string, defenderId: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest("[data-context-menu]")) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  const idIsAttack = menu.id.startsWith("a");
  const attackerId = idIsAttack ? menu.id : menu.other;
  const defenderId = idIsAttack ? menu.other : menu.id;
  if (!attackerId) return null;

  const items: { type: ActionType; defenderId: string }[] = [];
  if (defenderId) {
    items.push({ type: "turn", defenderId }, { type: "exclusion", defenderId }, { type: "block", defenderId });
  }
  if (frame.players[attackerId]?.hasBall) items.push({ type: "fake", defenderId: "" });
  if (items.length === 0) return null;

  const MENU_W = 230;
  const left = Math.max(8, Math.min(menu.x + 8, window.innerWidth - MENU_W - 8));
  const top = Math.max(8, Math.min(menu.y + 8, window.innerHeight - (items.length * 40 + 40) - 8));
  const title = defenderId
    ? `${PLAYER_BY_ID[attackerId].display} → ${PLAYER_BY_ID[defenderId].display}`
    : PLAYER_BY_ID[attackerId].label;

  return (
    <div data-context-menu className="fixed z-50 bg-[#1a2235] border border-[#2a3a55] rounded-lg shadow-2xl overflow-hidden" style={{ left, top, width: MENU_W }}>
      <div className="px-3 py-1.5 text-[12px] font-mono text-[#8899aa] uppercase tracking-wider border-b border-[#2a3a55] truncate">{title}</div>
      {items.map(({ type, defenderId: d }) => {
        const { label, color, Icon } = ACTION_META[type];
        const active = frame.actions.some(a => a.type === type && a.attackerId === attackerId && a.defenderId === d);
        return (
          <button
            key={type}
            onClick={() => { onToggle(type, attackerId, d); onClose(); }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-base text-left transition-colors hover:bg-[#243050] ${active ? "text-[#f0f4f8]" : "text-[#c5d0dc]"}`}
          >
            <Icon size={14} style={{ color }} />
            <span>{label}</span>
            {active && <span className="ml-auto flex items-center gap-1 text-[12px] font-mono" style={{ color }}>ACTIVA <Check size={12} /></span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [frames, setFrames] = useState<FrameData[]>(INITIAL_FRAMES);
  const [activeFrame, setActiveFrame] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playTitle, setPlayTitle] = useState("Local vs Visitant — Jugada 6 contra 5");
  const [editingTitle, setEditingTitle] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [looping, setLooping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [appMode, setAppMode] = useState<"pissarra" | "animació">("pissarra");
  const [showPaths, setShowPaths] = useState(true);
  
  // Estats visuals (Llegenda i Colors)
  const [showLegend, setShowLegend] = useState(true);
  const [swapColors, setSwapColors] = useState(false);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const closeContext = useCallback(() => setContextMenu(null), []);
  const [exportMenu, setExportMenu] = useState(false);
  const [frameDuration, setFrameDuration] = useState(2.0);
  const [exporting, setExporting] = useState(false);
  const [poolView, setPoolView] = useState<PoolView>("full");
  const { w: vw, h: vh } = VIEW_DIMS[poolView];
  const totalDuration = frames.length * frameDuration;

  const frame = frames[activeFrame];
  const selectedPlayer = selectedId ? ALL_PLAYERS.find(p => p.id === selectedId) : null;
  const selectedPos = selectedId ? frame.players[selectedId] : null;

  // Reproducció amb requestAnimationFrame (animació fluida)
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1); // evita salts si la pestanya queda en segon pla
      last = now;
      setElapsed(prev => Math.min(prev + dt, totalDuration));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, totalDuration]);

  useEffect(() => {
    if (!playing) return;
    if (elapsed >= totalDuration) {
      if (looping) { setElapsed(0); setActiveFrame(0); return; }
      setPlaying(false);
    }
    setActiveFrame(Math.min(frames.length - 1, Math.floor(elapsed / frameDuration)));
  }, [elapsed, playing, looping, totalDuration, frameDuration, frames.length]);

  function updatePlayerPos(id: string, x: number, y: number) {
    setFrames(prev => prev.map((f, i) => i !== activeFrame ? f : { ...f, players: { ...f.players, [id]: { ...f.players[id], x, y } } }));
  }

  function updateBallPos(x: number, y: number) {
    setFrames(prev => prev.map((f, i) => i !== activeFrame ? f : { ...f, ball: { x, y }, players: autoAssignBall(f.players, { x, y }) }));
  }

  // Funció per ocultar/restaurar la jugadora
  function toggleVisibility(id: string) {
    setFrames(prev => prev.map((f, i) => {
      if (i !== activeFrame) return f;
      const wasHidden = !!f.players[id].isHidden;
      const newPlayers = { ...f.players, [id]: { ...f.players[id], isHidden: !wasHidden } };
      
      // Si hem ocultat a la que tenia la pilota, fem que la pilota es reasigne automàticament a una altra
      if (!wasHidden && f.players[id].hasBall) {
        return { ...f, players: autoAssignBall(newPlayers, f.ball) };
      }
      return { ...f, players: newPlayers };
    }));
  }

  function toggleBallPossession(id: string) {
    setFrames(prev => prev.map((f, i) => {
      if (i !== activeFrame) return f;
      const updated: Record<string, PlayerPos> = {};
      for (const [k, v] of Object.entries(f.players)) {
        updated[k] = { ...v, hasBall: k === id ? !v.hasBall : false };
      }
      return { ...f, players: updated };
    }));
  }

  function toggleAction(type: ActionType, attackerId: string, defenderId: string) {
    setFrames(prev => prev.map((f, i) => {
      if (i !== activeFrame) return f;
      const same = (a: TacticalAction) => a.type === type && a.attackerId === attackerId && a.defenderId === defenderId;
      return {
        ...f,
        actions: f.actions.some(same) ? f.actions.filter(a => !same(a)) : [...f.actions, { type, attackerId, defenderId }],
      };
    }));
  }

  function addFrame() {
    const newFrame = makeFrame(`f${Date.now()}`, `Fotograma ${frames.length + 1}`,frames[frames.length - 1]);
    setFrames(prev => [...prev, newFrame]);
    setActiveFrame(frames.length);
    setElapsed(frames.length * frameDuration);
    setPlaying(false);
  }

  function deleteFrame(idx: number) {
    if (frames.length <= 1) return;
    const newActive = Math.max(0, activeFrame >= idx ? activeFrame - 1 : activeFrame);
    setFrames(prev => prev.filter((_, i) => i !== idx));
    setActiveFrame(newActive);
    setElapsed(newActive * frameDuration);
    setPlaying(false);
  }

  function changeFrameDuration(v: number) {
    const d = Math.max(0.5, v || 0.5);
    setFrameDuration(d);
    setElapsed(activeFrame * d);
  }

  function togglePlay() {
    if (!playing) {
      setAppMode("animació"); // la interpolació només existeix en mode animació
      setSelectedId(null);
      setContextMenu(null);
      if (elapsed >= totalDuration) { setElapsed(0); setActiveFrame(0); }
    }
    setPlaying(p => !p);
  }

  function resetPlay() {
    setFrames(INITIAL_FRAMES);
    setActiveFrame(0);
    setElapsed(0);
    setPlaying(false);
    setSelectedId(null);
    setContextMenu(null);
  }

  function frameColor(idx: number) {
    return idx === activeFrame ? "border-[#00d4d4]" : "border-[#1e2d42]";
  }

  const startVideoExport = async (resolution: string) => {
    setExportMenu(false);
    if (typeof MediaRecorder === "undefined") {
      alert("Aquest navegador no permet exportar vídeo.");
      return;
    }
    setPlaying(false);
    setSelectedId(null);
    setContextMenu(null);
    setExporting(true);

    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    const originalFrame = activeFrame;
    const originalMode = appMode;
    const lastFrame = frames.length - 1;
    const is1080 = resolution.includes("1080");
    const W = is1080 ? 1920 : 1280;
    const H = is1080 ? 1080 : 720;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    const mimeType = [
      "video/mp4;codecs=avc1",
      "video/webm;codecs=vp9",
      "video/webm",
    ].find(t => MediaRecorder.isTypeSupported(t)) ?? "";
    const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
    const chunks: BlobPart[] = [];

    const scale = Math.min(W / vw, H / vh);
    const dw = vw * scale, dh = vh * scale;
    const dx = (W - dw) / 2, dy = (H - dh) / 2;

    const loadPoolImage = async () => {
      const svg = document.getElementById("pool-svg") as unknown as SVGSVGElement | null;
      if (!svg) throw new Error("No s'ha trobat la piscina");
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", String(vw));
      clone.setAttribute("height", String(vh));
      const xml = new XMLSerializer().serializeToString(clone);
      const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
      try {
        const img = new Image();
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error("No s'ha pogut renderitzar la piscina"));
          img.src = url;
        });
        return img;
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    const drawFrame = async () => {
      const img = await loadPoolImage();
      ctx.fillStyle = "#080e1c";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const showAt = (e: number) => {
      setElapsed(e);
      setActiveFrame(Math.min(lastFrame, Math.floor(e / frameDuration)));
    };

    let recorder: MediaRecorder | null = null;

    try {
      setAppMode("animació"); // sense això l'exportació no interpola els moviments
      showAt(0);
      await wait(100); // deixa que React repinti sense selecció i en mode animació

      const rec = new MediaRecorder(
        canvas.captureStream(30),
        mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined
      );
      recorder = rec;
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const stopped = new Promise<void>(res => { rec.onstop = () => res(); });

      await drawFrame();
      rec.start();

      // El temps de l'animació segueix el rellotge real: el vídeo dura exactament `totalDuration`
      const startedAt = performance.now();
      for (;;) {
        const e = (performance.now() - startedAt) / 1000;
        if (e >= totalDuration) break;
        showAt(e);
        await wait(20); // temps perquè React renderitzi
        await drawFrame();
      }

      showAt(totalDuration);
      await wait(20);
      await drawFrame();
      await wait(150);
      rec.stop();
      await stopped;

      const blob = new Blob(chunks, { type: mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${playTitle.trim().replace(/[\\/:*?"<>|\s]+/g, "_") || "jugada"}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error(err);
      if (recorder && recorder.state !== "inactive") recorder.stop();
      alert("Error exportant el vídeo.");
    } finally {
      setAppMode(originalMode);
      setActiveFrame(originalFrame);
      setElapsed(originalFrame * frameDuration);
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0f1e] overflow-hidden select-none">
      <header className="flex items-center gap-3 px-4 py-2 bg-[#0d1b2a] border-b border-[#1e2d42] shrink-0" style={{ minHeight: 64 }}>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              className="bg-[#1a2235] border border-[#00d4d4] rounded px-2 py-1 text-xl text-[#f0f4f8] font-display font-bold tracking-wide outline-none w-full max-w-sm"
              value={playTitle}
              onChange={e => setPlayTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => e.key === "Enter" && setEditingTitle(false)}
            />
          ) : (
            <button className="flex items-center gap-1.5 group max-w-sm" onClick={() => setEditingTitle(true)}>
              <span className="font-display font-bold text-xl text-[#f0f4f8] tracking-wide truncate">{playTitle}</span>
              <Pencil size={12} className="text-[#4a5568] group-hover:text-[#8899aa]" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={resetPlay} disabled={exporting} className="btn-ghost flex items-center gap-1 px-2.5 py-1.5 rounded text-sm font-mono min-h-[40px] text-[#e74c3c] hover:text-[#ff6b6b] hover:bg-[#2a1515]">
            <RotateCcw size={14} /><span className="hidden md:inline">Reiniciar</span>
          </button>
        </div>

        <div className="w-px h-6 bg-[#1e2d42]" />

        <div className="flex items-center gap-1">
          <button className={`flex items-center justify-center w-10 h-10 rounded-lg disabled:opacity-40 transition-colors ${playing ? "bg-[#1a2235] text-[#00d4d4]" : "bg-[#1a2235] text-[#f0f4f8] hover:text-[#00d4d4]"}`} onClick={togglePlay} disabled={exporting} title={playing ? "Pausa" : "Reproduir"}>
            {playing ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
          </button>
          <button className="flex items-center justify-center w-10 h-10 rounded-lg disabled:opacity-40 bg-[#1a2235] text-[#8899aa] hover:text-[#f0f4f8] transition-colors" onClick={() => { setPlaying(false); setElapsed(0); setActiveFrame(0); }} disabled={exporting} title="Aturar">
            <Square size={16} fill="currentColor" />
          </button>
          <button className={`flex items-center justify-center w-10 h-10 rounded-lg disabled:opacity-40 transition-colors ${looping ? "bg-[#00d4d4] text-[#0a0f1e]" : "bg-[#1a2235] text-[#8899aa] hover:text-[#f0f4f8]"}`} onClick={() => setLooping(l => !l)} title="Bucle">
            <Repeat size={18} />
          </button>
          <div className="font-mono text-sm text-[#00d4d4] bg-[#0d1b2a] px-2.5 py-1.5 rounded border border-[#1e2d42] min-w-[110px] text-center tabular-nums">
            {formatTime(elapsed)} / {formatTime(totalDuration)}
          </div>
        </div>

        <div className="flex-1" />
        <div className="flex items-center rounded-lg border border-[#1e2d42] overflow-hidden mr-3">
          {([["full", "Piscina completa"], ["half", "Mig camp"]] as const).map(([v, label]) => (
            <button
              key={v}
              disabled={exporting}
              onClick={() => { setPoolView(v); setContextMenu(null); setSelectedId(null); }}
              className={`px-2.5 py-1.5 text-sm min-h-[40px] transition-colors disabled:opacity-50 ${poolView === v ? "bg-[#00d4d4] text-[#0a0f1e] font-semibold" : "bg-[#1a2235] text-[#8899aa] hover:text-[#f0f4f8]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center rounded-lg border border-[#1e2d42] overflow-hidden mr-3">
          {(["pissarra", "animació"] as const).map(m => (
            <button
              key={m}
              disabled={exporting}
              onClick={() => { setAppMode(m); if (m === "pissarra") { setPlaying(false); setElapsed(activeFrame * frameDuration); } }}
              className={`px-3 py-1.5 text-sm min-h-[40px] transition-colors capitalize disabled:opacity-50 ${appMode === m ? "bg-[#00d4d4] text-[#0a0f1e] font-semibold" : "bg-[#1a2235] text-[#8899aa] hover:text-[#f0f4f8]"}`}
            >
              {m}
            </button>
          ))}
        </div>

        <button onClick={() => setShowPaths(p => !p)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm transition-colors min-h-[40px] mr-2 ${showPaths ? "bg-[#1a2235] text-[#00d4d4] border border-[#00d4d420]" : "btn-ghost"}`}>
          <Route size={16} />
          <span className="hidden lg:inline">Trajectòries</span>
        </button>

        <div className="relative">
          <button disabled={exporting} onClick={() => setExportMenu(p => !p)} className="btn-export flex items-center gap-2 px-4 py-2 rounded-lg text-base min-h-[40px] font-display tracking-wide disabled:opacity-50 disabled:cursor-wait">
            <Download size={18} />
            {exporting ? "Exportant…" : "Exportar MP4"}
          </button>
          {exportMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[#1a2235] border border-[#2a3a55] rounded-lg shadow-2xl z-50 min-w-[140px]">
              <div className="px-3 py-1.5 text-[12px] font-mono text-[#8899aa] uppercase tracking-wider border-b border-[#2a3a55]">Resolució</div>
              {["720p HD", "1080p Full HD"].map(res => (
                <button key={res} className="w-full text-left px-3 py-2.5 text-base text-[#f0f4f8] hover:bg-[#243050] transition-colors flex items-center justify-between" onClick={() => startVideoExport(res)}>
                  <span>{res}</span>
                  <span className="text-[#8899aa] text-sm font-mono">{res.includes("1080") ? "1920×1080" : "1280×720"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex items-center justify-center bg-[#080e1c] p-3 overflow-hidden">
          <div className="relative rounded-xl overflow-hidden" style={{ width: `min(100%, calc((100vh - 235px) * ${vw}/${vh}))`, aspectRatio: `${vw}/${vh}`, boxShadow:"0 0 0 1px #1e2d42, 0 8px 40px rgba(0,0,0,0.6), 0 0 60px rgba(0,212,212,0.05)" }}>
            <PoolCanvas 
              view={poolView} 
              frames={frames} 
              activeFrame={activeFrame} 
              selectedId={selectedId} 
              onSelectPlayer={setSelectedId} 
              onMovePlayer={updatePlayerPos} 
              onMoveBall={updateBallPos} 
              showPaths={showPaths} 
              onContextMenu={(id, other, x, y) => setContextMenu({ id, other, x, y })} 
              onCloseContext={closeContext}
              appMode={appMode}
              elapsed={elapsed}
              frameDuration={frameDuration}
              showLegend={showLegend}
              swapColors={swapColors}
              hideFakeIcons={playing || exporting}
            />
            {exporting && <div className="absolute inset-0 z-40 cursor-wait" />}
          </div>
        </main>

        <aside className={`w-[270px] shrink-0 bg-[#0d1b2a] border-l border-[#1e2d42] flex flex-col overflow-y-auto ${exporting ? "pointer-events-none opacity-60" : ""}`}>
          <div className="p-3 border-b border-[#1e2d42]">
            <div className="text-[15px] font-display font-bold text-[#8899aa] uppercase tracking-widest mb-3">Inspector</div>

            {selectedPlayer && selectedPos ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <svg width={32} height={32} viewBox="0 0 32 32">
                    <circle r={14} cx={16} cy={16} fill={getTokenColors(selectedPlayer.team, swapColors).fill} />
                    <text textAnchor="middle" dominantBaseline="central" x={16} y={17} fontSize={14} fontWeight="800" fill={getTokenColors(selectedPlayer.team, swapColors).text} fontFamily="Barlow Condensed,sans-serif">{selectedPlayer.display}</text>
                  </svg>
                  <div>
                    <div className="font-display font-bold text-[#f0f4f8] text-xl leading-none">{selectedPlayer.label}</div>
                    <div className="text-sm text-[#8899aa] capitalize mt-0.5">
                      {selectedPlayer.team === "keeper" 
                        ? "Portera" 
                        : selectedPlayer.team === "attack" 
                          ? (swapColors ? "Equip Visitant (Atac)" : "Equip Local (Atac)") 
                          : (swapColors ? "Equip Local (Defensa)" : "Equip Visitant (Defensa)")}
                    </div>
                  </div>
                </div>

                {frame.actions.some(a => a.type === "exclusion" && a.defenderId === selectedId) && (
                  <div className="mb-3 bg-[#2a1515] border border-[#e74c3c] rounded px-2 py-1.5 flex items-center gap-2">
                    <Zap size={14} className="text-[#e74c3c]" />
                    <span className="text-[#e74c3c] text-[12px] font-bold uppercase tracking-wider">Jugadora Expulsada</span>
                  </div>
                )}

                <div className="mb-2">
                  <button onClick={() => toggleBallPossession(selectedId!)} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded text-sm font-medium transition-colors ${selectedPos.hasBall ? "bg-[#2e2608] border border-[#ffd92e40] text-[#ffd92e]" : "bg-[#111827] border border-[#1e2d42] text-[#8899aa] hover:text-[#f0f4f8]"}`}>
                    <Circle size={12} fill={selectedPos.hasBall ? BALL_COLOR : "#4a5568"} color={selectedPos.hasBall ? BALL_COLOR : "#4a5568"} />
                    {selectedPos.hasBall ? "Pilota a la mà" : "Lliure / Passada"}
                  </button>
                </div>
                <button onClick={() => toggleVisibility(selectedId!)} className="mt-2 w-full flex items-center gap-2 px-2.5 py-2 rounded text-sm font-medium bg-[#111827] border border-[#1e2d42] text-[#8899aa] hover:text-[#f0f4f8] transition-colors">
                  {selectedPos.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  {selectedPos.isHidden ? "Restaurar Jugadora" : "Ocultar Jugadora"}
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <Pointer size={28} className="text-[#2a3a55] mb-2 mx-auto" />
                <div className="text-sm text-[#4a5568]">Clica una jugadora per inspeccionar-la</div>
              </div>
            )}
          </div>

          <div className="p-3 flex-1 border-b border-[#1e2d42]">
            <div className="text-[15px] font-display font-bold text-[#8899aa] uppercase tracking-widest mb-3">Banqueta</div>
            {([
              { team: "attack", players: ROSTER_ATTACK, label: swapColors ? "Atac (Visitant)" : "Atac (Local)" },
              { team: "defense", players: ROSTER_DEFENSE, label: swapColors ? "Defensa (Local)" : "Defensa (Visitant)" },
            ] as const).map(({ team, players, label }) => (
              <div key={team} className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-2 h-2 rounded-full border border-gray-500" style={{ background: getTokenColors(team, swapColors).fill }} />
                  <span className="text-[13px] text-[#c5d0dc] font-display font-bold uppercase tracking-wider">{label}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {players.map(p => {
                    const colors = getTokenColors(p.team, swapColors);
                    const isHidden = frame.players[p.id]?.isHidden;
                    return (
                      <div key={p.id}
                           onClick={() => setSelectedId(prev => prev === p.id ? null : p.id)}
                           title={`${label} ${p.display} (${p.label})`}
                           className={`flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-all border-2 ${selectedId === p.id ? 'ring-2 ring-[#00d4d4] ring-offset-2 ring-offset-[#0d1b2a]' : ''} ${isHidden ? 'opacity-30 grayscale' : 'hover:opacity-80'}`}
                           style={{ background: colors.fill, borderColor: colors.stroke }}>
                        <span className="font-display font-bold text-sm" style={{ color: colors.text }}>{p.display}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Configuració Visual Inferior */}
          <div className="p-3">
            <div className="text-[15px] font-display font-bold text-[#8899aa] uppercase tracking-widest mb-3">Configuració Visual</div>
            <button onClick={() => setSwapColors(p => !p)} className="mb-2 w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded text-sm font-medium bg-[#111827] border border-[#1e2d42] text-[#8899aa] hover:text-[#f0f4f8] transition-colors">
              <div className="flex items-center gap-2"><Palette size={14} /> Colors</div>
              <span>{swapColors ? "Defensa" : "Atac"}</span>
            </button>
            <button onClick={() => setShowLegend(p => !p)} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded text-sm font-medium border transition-colors ${showLegend ? "bg-[#1a2e0a] border-[#b8ff2e40] text-[#b8ff2e]" : "bg-[#111827] border-[#1e2d42] text-[#8899aa] hover:text-[#f0f4f8]"}`}>
              <MapIcon size={14} /> Llegenda Piscina
            </button>
          </div>
        </aside>
      </div>

      <footer className={`bg-[#0d1b2a] border-t border-[#1e2d42] shrink-0 flex flex-col justify-center ${exporting ? "pointer-events-none opacity-60" : ""}`} style={{ height: 165 }}>
        <div className="flex items-stretch h-full px-4 py-3 gap-0 overflow-x-auto">
          
          <div className="flex flex-col justify-center mr-4 shrink-0 min-w-[90px] gap-1">
            <div className="text-[13px] font-display font-bold text-[#8899aa] uppercase tracking-widest">Línia de temps</div>
            <div className="text-sm font-mono text-[#00d4d4]">{formatTime(elapsed)}</div>
            <div className="flex items-center gap-1 bg-[#0a1525] border border-[#1e2d42] px-1.5 py-0.5 rounded w-fit" title="Durada de cada frame">
              <input type="number" step="0.5" min="0.5" value={frameDuration}
                onChange={e => changeFrameDuration(+e.target.value)}
                className="w-10 bg-transparent text-[#00d4d4] font-mono text-sm outline-none text-right" />
              <span className="text-[#00d4d4] font-mono text-[12px]">s/frame</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-1 overflow-x-auto py-1 px-1">
            {frames.map((f, idx) => {
              return (
                <div key={f.id} onClick={() => { setActiveFrame(idx); setElapsed(idx * frameDuration); }} className={`timeline-frame shrink-0 rounded-lg border-2 cursor-pointer overflow-hidden flex flex-col ${frameColor(idx)} w-[170px]`}>
                  <div className="flex-1 bg-[#0b2a4a] relative overflow-hidden">
                    <FrameThumbnail frame={f} swapColors={swapColors} />
                    {idx === activeFrame && <div className="absolute inset-0 border-2 border-[#00d4d4] rounded pointer-events-none opacity-40" />}
                  </div>
                  <div className="bg-[#111827] px-2 py-1 flex items-center justify-between gap-1">
                    <span className="text-[13px] font-display font-bold text-[#f0f4f8] truncate leading-tight">{f.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {frames.length > 1 && (
                        <button onClick={e => { e.stopPropagation(); deleteFrame(idx); }} className="text-[#4a5568] hover:text-[#e74c3c] w-6 h-6 flex items-center justify-center rounded hover:bg-[#2a1515] transition-colors"><X size={14} /></button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <button onClick={addFrame} className="shrink-0 w-24 min-h-[110px] rounded-lg border-2 border-dashed border-[#1e2d42] hover:border-[#00d4d4] hover:bg-[#00d4d408] transition-colors flex flex-col items-center justify-center gap-1 text-[#4a5568] hover:text-[#00d4d4]">
              <Plus size={28} />
              <span className="text-[11px] font-mono uppercase tracking-wider">Nou Frame</span>
            </button>
          </div>
        </div>
      </footer>

      {contextMenu && frame.players[contextMenu.id] && (
        <ActionContextMenu menu={contextMenu} frame={frame} onToggle={toggleAction} onClose={closeContext} />
      )}
    </div>
  );
}