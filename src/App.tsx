import { useState, useRef, useEffect } from "react";
import { RotateCcw, Zap, Shield, RefreshCw, X, Plus, Pencil, Pointer } from "lucide-react"; // <-- NOU

// ─── Types ────────────────────────────────────────────────────────────────────

type Team = "attack" | "defense" | "keeper";

interface Player {
  id: string;
  num: number; // Número original (útil si algun dia se'n necessiten de diferents)
  display: string; // Text que es mostra a la gorra (P, 1, 2, B...)
  team: Team;
  label: string;
}

interface PlayerPos {
  x: number;
  y: number;
  angle: number;
  hasBall: boolean;
}

interface BallPos {
  x: number;
  y: number;
}

type ActionType = "turn" | "exclusion" | "block";

interface TacticalAction {
  type: ActionType;
  attackerId: string;
  defenderId: string;
}

interface FrameData {
  id: string;
  label: string;
  players: Record<string, PlayerPos>;
  ball: BallPos;
  actions: TacticalAction[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POOL_W = 800;
const POOL_H = 460;

type PoolView = "full" | "half";
const VIEW_DIMS: Record<PoolView, { w: number; h: number }> = {
  full: { w: POOL_W, h: POOL_H },
  half: { w: POOL_H, h: POOL_W / 2 },
};

// Definició de les jugadores (P, 1, 2, 3, 4, 5, B)
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

function autoAssignBall(players: Record<string, PlayerPos>, ball: BallPos) {
  let closestId = "";
  let minDist = Infinity;
  for (const [id, p] of Object.entries(players)) {
    if (ALL_PLAYERS.find(ap => ap.id === id)?.team === "attack") {
      const d = Math.hypot(p.x - ball.x, p.y - ball.y);
      if (d < minDist) { minDist = d; closestId = id; }
    }
  }
  const updated = { ...players };
  for (const id of Object.keys(updated)) {
    updated[id] = { ...updated[id], hasBall: id === closestId };
  }
  return updated;
}

function makeDefaultPositions(): Record<string, PlayerPos> {
  return {
    aP: { x: 35, y: 230, angle: 0, hasBall: false },    // Portera a la seva porta
    a1: { x: 725, y: 390, angle: 140, hasBall: false }, // Extrem dret
    a2: { x: 620, y: 320, angle: 160, hasBall: false }, // Lateral dret
    a3: { x: 570, y: 230, angle: 180, hasBall: true },  // Central - Té la pilota
    a4: { x: 620, y: 140, angle: 200, hasBall: false }, // Lateral esq
    a5: { x: 725, y: 70, angle: 220, hasBall: false },  // Extrem esq
    aB: { x: 720, y: 230, angle: 180, hasBall: false }, // Boia
    
    // Defensores assignades (distàncies < 40px respecte el seu atacant)
    dP: { x: 765, y: 230, angle: 180, hasBall: false }, // Portera rival
    d5: { x: 723, y: 355, angle: 320, hasBall: false }, // Defensa a a1
    d4: { x: 640, y: 300, angle: 340, hasBall: false }, // Defensa a a2
    dB: { x: 600, y: 230, angle: 0, hasBall: false },   // Defensa a a3
    d2: { x: 640, y: 160, angle: 20, hasBall: false },  // Defensa a a4
    d1: { x: 723, y: 105, angle: 40, hasBall: false },  // Defensa a a5
    d3: { x: 745, y: 230, angle: 180, hasBall: false }, // Defensa a aB (Boia)
  };
}

function makeFrame(id: string, label: string, prev?: FrameData): FrameData {
  return {
    id,
    label,
    players: prev ? JSON.parse(JSON.stringify(prev.players)) : makeDefaultPositions(),
    // Posició inicial de la pilota exacte a la mà del jugador a3 (570 + 12, 230 + 12)
    ball: prev ? { ...prev.ball } : { x: 582, y: 242 }, 
    actions: [],
  };
}

const INITIAL_FRAMES: FrameData[] = [
  makeFrame("f1", "Posicions Inicials")
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlayerTokenSVG({
  player,
  pos,
  selected,
  rot = 0,
}: {
  player: Player;
  pos: PlayerPos;
  selected: boolean;
  isOnCanvas: boolean;
  rot?: number;
}) {
  const isAttack = player.team === "attack";
  const isKeeper = player.team === "keeper";

  const fill = isKeeper ? "#e74c3c" : isAttack ? "#ffffff" : "#1a3a6b";
  const stroke = selected ? "#00d4d4" : isAttack ? "#cccccc" : "#0a1525";
  const textColor = isAttack ? "#1a3a6b" : "#ffffff";

  return (
    <g transform={`translate(${pos.x},${pos.y}) rotate(${rot})`} style={{ cursor: "grab" }}>
      {selected && (
        <circle r={24} fill="none" stroke="#00d4d4" strokeWidth={2} strokeDasharray="4 3" opacity={0.8} />
      )}
      <circle r={15} fill="rgba(0,0,0,0.3)" cx={1} cy={2} />
      <circle r={15} fill={fill} stroke={stroke} strokeWidth={selected ? 2.5 : 1.5} />
      <text textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="800" fontFamily="Barlow Condensed,sans-serif" fill={textColor} y={1}>
        {player.display}
      </text>
    </g>
  );
}

function ActionsLayer({ actions, players, rot = 0 }: { actions: TacticalAction[]; players: Record<string, PlayerPos>; rot?: number }) {
  return (
    <g style={{ pointerEvents: "none" }}>
      {actions.map(a => {
        const att = players[a.attackerId];
        const def = players[a.defenderId];
        if (!att || !def) return null;

        const dx = def.x - att.x;
        const dy = def.y - att.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const x1 = att.x + ux * 17, y1 = att.y + uy * 17;
        const x2 = def.x - ux * 17, y2 = def.y - uy * 17;
        const hasLine = len > 36;
        const key = `${a.type}-${a.attackerId}-${a.defenderId}`;

        if (a.type === "block") {
          const mx = (att.x + def.x) / 2;
          const my = (att.y + def.y) / 2;
          return (
            <g key={key}>
              {hasLine && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f0c040" strokeWidth={4} strokeLinecap="round" />}
              <circle cx={mx} cy={my} r={10} fill="#111827" stroke="#f0c040" strokeWidth={1.5} />
              <g transform={`translate(${mx}, ${my}) rotate(${rot}) translate(-7, -7)`}>
                <Shield size={14} color="#f0c040" />
              </g>
            </g>
          );
        }

        if (a.type === "exclusion") {
          return (
            <g key={key}>
              {hasLine && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e74c3c" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />}
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
                    <rect x={lx - 16} y={ly - 7} width={32} height={14} rx={7} fill="#e74c3c" />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="800" fill="#fff" fontFamily="Inter,sans-serif">EXP</text>
                  </g>
                );
              })()}
            </g>
          );
        }
      })}
    </g>
  );
}

function createSmoothPath(points: {x:number, y:number, t:number}[]) {
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
  prevFrame,
  showPaths,
  contextMenu,
  onContextMenu,
  onToggleAction,
  onCloseContext,
  view,
  appMode,
}: {
  view: PoolView;
  frames: FrameData[];
  activeFrame: number;
  selectedId: string | null;
  onSelectPlayer: (id: string | null) => void;
  onMovePlayer: (id: string, x: number, y: number) => void;
  onMoveBall: (x: number, y: number) => void;
  prevFrame?: FrameData;
  showPaths: boolean;
  contextMenu: { id: string; other: string; x: number; y: number } | null;
  onContextMenu: (id: string, other: string, x: number, y: number) => void;
  onToggleAction: (type: ActionType, attackerId: string, defenderId: string) => void;
  onCloseContext: () => void;
  appMode: "animació" | "pissarra";
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const draggingRef = useRef<{ id: string; type: "player" | "ball"; ox: number; oy: number; startX: number; startY: number; moved: boolean; wasSelected: boolean } | null>(null);
  
  // NOU ESTAT PER A LA CUA DE SERP (Tail)
  const [liveTrails, setLiveTrails] = useState<Record<string, { color: string, points: {x:number, y:number, t:number}[] }>>({});

  const frame = frames[activeFrame];

  function toSVGCoords(e: React.MouseEvent | MouseEvent) {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const { w, h } = VIEW_DIMS[view];
    const vx = (e.clientX - rect.left) * (w / rect.width);
    const vy = (e.clientY - rect.top) * (h / rect.height);
    return view === "half" ? { x: POOL_W - vy, y: vx } : { x: vx, y: vy };
  }

  function checkProximity(id: string, clientX: number, clientY: number) {
    if (!frame) return;
    const pos = frame.players[id];
    const opponentIds = Object.keys(frame.players).filter(k => k.startsWith(id.startsWith("a") ? "d" : "a"));
    let nearest: string | null = null;
    let best = 40;
    for (const oid of opponentIds) {
      const op = frame.players[oid];
      const dist = Math.hypot(pos.x - op.x, pos.y - op.y);
      if (dist < best) { best = dist; nearest = oid; }
    }
    if (nearest) onContextMenu(id, nearest, clientX, clientY);
  }

  function onMouseDownBase(e: React.MouseEvent, id: string, type: "player" | "ball") {
    e.stopPropagation();
    onCloseContext();
    const wasSelected = selectedId === id;
    if (type === "player") onSelectPlayer(id);
    else onSelectPlayer(null);

    const { x, y } = toSVGCoords(e);
    const pos = type === "ball" ? frame.ball : frame.players[id];
    draggingRef.current = { id, type, ox: x - pos.x, oy: y - pos.y, startX: e.clientX, startY: e.clientY, moved: false, wasSelected };

    if (appMode === "pissarra") {
      const p = ALL_PLAYERS.find(pl => pl.id === id);
      const trailColor = type === "ball" ? "#ffdd1d" : (p?.team === "attack" ? "#ffffff" : p?.team === "keeper" ? "#e74c3c" : "#1a3a6b");
      setLiveTrails(prev => ({
        ...prev,
        [id]: { color: trailColor, points: [{ x: pos.x, y: pos.y, t: Date.now() }] }
      }));
    }
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current || !svgRef.current) return;
      const dx = e.clientX - draggingRef.current.startX;
      const dy = e.clientY - draggingRef.current.startY;
      if (Math.hypot(dx, dy) > 3) draggingRef.current.moved = true; 

      const { x, y } = toSVGCoords(e);
      const minX = view === "half" ? POOL_W / 2 + 15 : 15;
      const nx = Math.max(minX, Math.min(POOL_W - 15, x - draggingRef.current.ox));
      const ny = Math.max(15, Math.min(POOL_H - 15, y - draggingRef.current.oy));
      
      if (draggingRef.current.type === "ball") onMoveBall(nx, ny);
      else onMovePlayer(draggingRef.current.id, nx, ny);

      if (draggingRef.current.moved && appMode === "pissarra") {
        const now = Date.now();
        const dragId = draggingRef.current.id;
        setLiveTrails(prev => {
          const current = prev[dragId];
          if (!current) return prev;
          const last = current.points[current.points.length - 1];
          if (Math.hypot(nx - last.x, ny - last.y) > 5) {
            return { ...prev, [dragId]: { ...current, points: [...current.points, { x: nx, y: ny, t: now }] } };
          }
          return prev;
        });
      }
    }
    
    function onUp(e: MouseEvent) {
      if (draggingRef.current) {
        const { id, type, moved, wasSelected } = draggingRef.current;
        if (type === "player") {
          if (moved) onSelectPlayer(null);
          else if (wasSelected) onSelectPlayer(null); 
          else checkProximity(id, e.clientX, e.clientY); 
        } else if (type === "ball") {
          if (!moved) onSelectPlayer(null);
        }
        draggingRef.current = null;
      }
    }
    
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  });

  // Temporitzador per esborrar automàticament els punts antics del rastre
  useEffect(() => {
    if (appMode !== "pissarra") return;
    const timer = setInterval(() => {
      const now = Date.now();
      setLiveTrails(prev => {
        let changed = false;
        const next: typeof prev = {};
        for (const id in prev) {
          const trail = prev[id];
          const validPoints = trail.points.filter(p => now - p.t < 1000); // 1.5 segons de durada abans d'esvair-se
          if (validPoints.length !== trail.points.length) changed = true;
          if (validPoints.length > 0) next[id] = { ...trail, points: validPoints };
        }
        return changed ? next : prev;
      });
    }, 50);
    return () => clearInterval(timer);
  }, [appMode]);

  const lineColor = "rgba(255,255,255,0.5)";

  return (
    <div className="relative w-full h-full" onMouseDown={() => { onSelectPlayer(null); onCloseContext(); }}>
      <svg id="pool-svg" ref={svgRef} viewBox={`0 0 ${VIEW_DIMS[view].w} ${VIEW_DIMS[view].h}`} className="w-full h-full" style={{ display: "block" }}>
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

        {/* Línia de 5 metres (Groc ataronjat) */}
        {[20 + (POOL_W - 40) * (5 / 30), POOL_W - 20 - (POOL_W - 40) * (5 / 30)].map((x, i) => (
          <line key={i} x1={x} y1={20} x2={x} y2={POOL_H - 20} stroke="#f59e0b" strokeWidth={1.5} opacity={0.8} />
        ))}

        {/* Línia de 6 metres (Groc verdós) */}
        {[20 + (POOL_W - 40) * (6 / 30), POOL_W - 20 - (POOL_W - 40) * (6 / 30)].map((x, i) => (
          <line key={i} x1={x} y1={20} x2={x} y2={POOL_H - 20} stroke="#84cc16" strokeWidth={1.5} opacity={0.8} />
        ))}

        {/* Línia de 2 metres (Vermella) */}
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
              {[0, 2, 4].map(dx => (
                <line key={dx} x1={i === 0 ? gx - 2 + dx * 2 : gx - 6 + dx * 2} y1={goalY1} x2={i === 0 ? gx - 2 + dx * 2 : gx - 6 + dx * 2} y2={goalY2} stroke="rgba(255,255,255,0.25)" strokeWidth={0.5} />
              ))}
              <circle r={3} cx={i === 0 ? gx + 6 : gx - 6} cy={goalY1} fill="#fff" opacity={0.9} />
              <circle r={3} cx={i === 0 ? gx + 6 : gx - 6} cy={goalY2} fill="#fff" opacity={0.9} />
            </g>
          );
        })}
        
        {view === "full" && <text x={POOL_W / 2} y={14} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="JetBrains Mono">MIG CAMP</text>}

        {showPaths && prevFrame && Object.keys(frame.players).map(id => {
          const cur = frame.players[id];
          const prev = prevFrame.players[id];
          if (!prev || (Math.abs(cur.x - prev.x) < 5 && Math.abs(cur.y - prev.y) < 5)) return null;
          const player = ALL_PLAYERS.find(p => p.id === id)!;
          const color = player?.team === "attack" ? "#ffffff" : "#c0392b";
          const mx = (prev.x + cur.x) / 2 + (cur.y - prev.y) * 0.3;
          const my = (prev.y + cur.y) / 2 - (cur.x - prev.x) * 0.3;
          return (
            <path key={id} d={`M${prev.x},${prev.y} Q${mx},${my} ${cur.x},${cur.y}`} fill="none" stroke={color} strokeWidth={1.5} opacity={0.8} className="motion-path" />
          );
        })}

        {showPaths && prevFrame && (() => {
          const cur = frame.ball;
          const prev = prevFrame.ball;
          if (Math.abs(cur.x - prev.x) < 5 && Math.abs(cur.y - prev.y) < 5) return null;
          const mx = (prev.x + cur.x) / 2 + (cur.y - prev.y) * 0.4;
          const my = (prev.y + cur.y) / 2 - (cur.x - prev.x) * 0.4;
          return (
            <path d={`M${prev.x},${prev.y} Q${mx},${my} ${cur.x},${cur.y}`} fill="none" stroke="#ffdd1d" strokeWidth={2} opacity={0.6} className="motion-path" />
          );
        })()}

        {/* LÍNIES TEMPORALS (CUA DE SERP QUE S'ESVAEIX) */}
        {appMode === "pissarra" && Object.entries(liveTrails).map(([id, trail]) => {
          if (trail.points.length < 2) return null;
          return (
            <path key={id} d={createSmoothPath(trail.points)} fill="none" stroke={trail.color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 8" opacity={0.7} />
          );
        })}
        
        {ALL_PLAYERS.map(player => {
          const pos = frame.players[player.id];
          if (!pos) return null;
          if (view === "half" && pos.x < POOL_W / 2) return null;
          return (
            <g key={player.id} filter="url(#tokenShadow)" onMouseDown={e => { onMouseDownBase(e, player.id, "player"); }} className="player-token">
              <PlayerTokenSVG player={player} pos={pos} selected={selectedId === player.id} isOnCanvas rot={view === "half" ? 90 : 0} />
            </g>
          );
        })}
        
        <ActionsLayer actions={frame.actions} players={frame.players} rot={view === "half" ? 90 : 0} />
        <g filter="url(#ballGlow)" onMouseDown={e => { onMouseDownBase(e, "ball", "ball"); }} style={{ cursor: "grab" }}>
          <circle r={10} cx={frame.ball.x} cy={frame.ball.y} fill="#ffdd1d8c" />
          <circle r={9} cx={frame.ball.x} cy={frame.ball.y} fill="#ffdd1d" />
          <circle r={9} cx={frame.ball.x} cy={frame.ball.y} fill="none" stroke="#ffc31d" strokeWidth={1.5} />
          <circle r={3} cx={frame.ball.x - 3} cy={frame.ball.y - 4} fill="rgba(255,255,255,0.4)" />
        </g>
      </g>

        <g transform={`translate(${(VIEW_DIMS[view].w - 115) / 2}, ${VIEW_DIMS[view].h - 65})`}>
          <rect x={0} y={0} width={115} height={58} rx={4} fill="rgba(10,15,30,0.7)" />
          {[
            { color: "#ffffff", label: "Equip Local (Atac)", stroke: "#ccc" },
            { color: "#1a3a6b", label: "Equip Visitant (Def)", stroke: "none" },
            { color: "#e74c3c", label: "Portera", stroke: "none" },
          ].map(({ color, label, stroke }, i) => (
            <g key={label} transform={`translate(8, ${i * 17 + 10})`}>
              <circle r={5} cx={5} cy={0} fill={color} stroke={stroke} />
              <text x={15} y={4} fontSize={9} fill="rgba(255,255,255,0.8)" fontFamily="Inter,sans-serif">{label}</text>
            </g>
          ))}
        </g>
      </svg>

      {contextMenu && (() => {
        const attackerId = contextMenu.id.startsWith("a") ? contextMenu.id : contextMenu.other;
        const defenderId = contextMenu.id.startsWith("a") ? contextMenu.other : contextMenu.id;
        const attDisplay = ALL_PLAYERS.find(p => p.id === attackerId)?.display ?? "?";
        const defDisplay = ALL_PLAYERS.find(p => p.id === defenderId)?.display ?? "?";
        
        // MODIFICAT AMB ICONES DE LUCIDE
        const options: { type: ActionType; icon: React.ReactNode; label: string; color: string }[] = [
          { type: "turn", icon: <RefreshCw size={14} color="#00d4d4" />, label: "Girar Defensor", color: "#00d4d4" },
          { type: "exclusion", icon: <Zap size={14} color="#e74c3c" />, label: "Provocar Expulsió", color: "#e74c3c" },
          { type: "block", icon: <Shield size={14} color="#f0c040" />, label: "Bloquejar / Agafar", color: "#f0c040" },
        ];
        
        return (
          <div
            className="context-menu absolute z-50 bg-[#1a2235] border border-[#2a3a55] rounded-lg shadow-2xl p-1 min-w-[180px]"
            style={{ left: contextMenu.x - (svgRef.current?.getBoundingClientRect().left ?? 0), top: contextMenu.y - (svgRef.current?.getBoundingClientRect().top ?? 0) - 10 }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-[10px] font-mono text-[#8899aa] uppercase tracking-wider border-b border-[#2a3a55] mb-1">
              Acció Tàctica · Atac {attDisplay} vs Def {defDisplay}
            </div>
            {options.map(({ type, icon, label, color }) => {
              const active = frame.actions.some(a => a.type === type && a.attackerId === attackerId && a.defenderId === defenderId);
              return (
                <button
                  key={type}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-left hover:bg-[#243050] transition-colors"
                  onClick={() => { onToggleAction(type, attackerId, defenderId); onCloseContext(); }}
                >
                  {icon}
                  <span className="text-[#f0f4f8] flex-1">{label}</span>
                  {active && <span style={{ color }} className="text-xs font-bold">✓</span>}
                </button>
              );
            })}
          </div>
        );
      })()}
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
  const [appMode, setAppMode] = useState<"animació" | "pissarra">("pissarra");
  const [elapsed, setElapsed] = useState(0);
  const [showPaths, setShowPaths] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ id: string; other: string; x: number; y: number } | null>(null);
  const [exportMenu, setExportMenu] = useState(false);
  const [frameDuration, setFrameDuration] = useState(2.0);
  const [exporting, setExporting] = useState(false);
  const [poolView, setPoolView] = useState<PoolView>("full");
  const { w: vw, h: vh } = VIEW_DIMS[poolView];
  const totalDuration = frames.length * frameDuration;

  const frame = frames[activeFrame];
  const selectedPlayer = selectedId ? ALL_PLAYERS.find(p => p.id === selectedId) : null;
  const selectedPos = selectedId ? frame.players[selectedId] : null;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setElapsed(prev => Math.min(prev + 0.1, totalDuration));
    }, 100);
    return () => clearInterval(t);
  }, [playing, totalDuration]);

  // Final de la reproducció: bucle o aturada
  useEffect(() => {
    if (playing && elapsed >= totalDuration) {
      setPlaying(false);
    }
  }, [elapsed, playing, totalDuration]);

  // El frame actiu es deriva del temps mentre es reprodueix
  useEffect(() => {
    if (!playing) return;
    setActiveFrame(Math.min(frames.length - 1, Math.floor(elapsed / frameDuration)));
  }, [elapsed, playing, frameDuration, frames.length]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toFixed(1).padStart(4, "0");
    return `${m}:${sec}`;
  }

  function updatePlayerPos(id: string, x: number, y: number) {
    setFrames(prev => prev.map((f, i) => {
      if (i !== activeFrame) return f;
      
      const player = f.players[id];
      // Si la jugadora té la pilota, calculem la nova posició de la pilota (sempre +12, +12)
      const newBall = player?.hasBall ? { x: x + 12, y: y + 12 } : f.ball;
      
      return { 
        ...f, 
        // Actualitzem les posicions sense reavaluar la possessió
        players: { ...f.players, [id]: { ...player, x, y } },
        ball: newBall
      };
    }));
  }

  function updateBallPos(x: number, y: number) {
    setFrames(prev => prev.map((f, i) => {
      if (i !== activeFrame) return f;
      return {
        ...f,
        ball: { x, y },
        players: autoAssignBall(f.players, { x, y })
      };
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
    if (!playing && elapsed >= totalDuration) { setElapsed(0); setActiveFrame(0); }
    setPlaying(p => !p);
  }

  function resetPlay() {
    setFrames(JSON.parse(JSON.stringify(INITIAL_FRAMES)));
    setActiveFrame(0);
    setElapsed(0);
    setPlaying(false);
  }

  const prevFrame = activeFrame > 0 ? frames[activeFrame - 1] : undefined;

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
    const W = resolution.includes("1080") ? 1920 : 1280;
    const H = resolution.includes("1080") ? 1080 : 720;

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

    // Converteix la piscina (SVG) actual en una imatge
    const loadPoolImage = async () => {
      const svg = document.getElementById("pool-svg") as unknown as SVGSVGElement | null;
      if (!svg) throw new Error("No s'ha trobat la piscina");
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", String(vw));
      clone.setAttribute("height", String(vh));
      const xml = new XMLSerializer().serializeToString(clone);
      const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("No s'ha pogut renderitzar la piscina"));
        img.src = url;
      });
      URL.revokeObjectURL(url);
      return img;
    };

    const scale = Math.min(W / vw, H / vh);
    const dw = vw * scale, dh = vh * scale;
    const dx = (W - dw) / 2, dy = (H - dh) / 2;

    let recorder: MediaRecorder | null = null;

    try {
      const rec = new MediaRecorder(
        canvas.captureStream(30),
        mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined
      );
      recorder = rec;
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const stopped = new Promise<void>(res => { rec.onstop = () => res(); });

      ctx.fillStyle = "#080e1c";
      ctx.fillRect(0, 0, W, H);
      rec.start();

      for (let i = 0; i < frames.length; i++) {
        setActiveFrame(i);
        setElapsed(i * frameDuration);
        await wait(120); // deixa que React pinti el frame
        const img = await loadPoolImage();

        const end = performance.now() + frameDuration * 1000;
        while (performance.now() < end) {
          ctx.fillStyle = "#080e1c";
          ctx.fillRect(0, 0, W, H);
          ctx.drawImage(img, dx, dy, dw, dh);
          await wait(1000 / 30);
        }
      }

      await wait(100);
      rec.stop();
      await stopped;

      const blob = new Blob(chunks, { type: mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${playTitle.replace(/\s+/g, "_")}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error(err);
      if (recorder && recorder.state !== "inactive") recorder.stop();
      alert("Error exportant el vídeo.");
    } finally {
      setActiveFrame(originalFrame);
      setElapsed(originalFrame * frameDuration);
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0f1e] overflow-hidden select-none">
      <header className="flex items-center gap-3 px-4 py-2 bg-[#0d1b2a] border-b border-[#1e2d42] shrink-0" style={{ minHeight: 52 }}>
        <div className="flex items-center gap-2 mr-2">
          <svg width={28} height={28} viewBox="0 0 28 28">
            <rect width={28} height={28} rx={6} fill="#00d4d4" opacity={0.15} />
            <circle cx={14} cy={14} r={8} fill="none" stroke="#00d4d4" strokeWidth={2} />
            <path d="M6,14 Q14,8 22,14" fill="none" stroke="#00d4d4" strokeWidth={1.5} />
            <circle cx={14} cy={14} r={3} fill="#ffdd1d" />
          </svg>
          <span className="font-display text-[#00d4d4] font-bold text-sm tracking-wider uppercase hidden sm:block">AquaTac</span>
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              className="bg-[#1a2235] border border-[#00d4d4] rounded px-2 py-1 text-sm text-[#f0f4f8] font-display font-semibold tracking-wide outline-none w-full max-w-sm"
              value={playTitle}
              onChange={e => setPlayTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={e => e.key === "Enter" && setEditingTitle(false)}
            />
          ) : (
            <button className="flex items-center gap-1.5 group max-w-sm" onClick={() => setEditingTitle(true)}>
              <span className="font-display font-semibold text-sm text-[#f0f4f8] tracking-wide truncate">{playTitle}</span>
              <Pencil size={12} className="text-[#4a5568] group-hover:text-[#8899aa]" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button onClick={resetPlay} className="btn-ghost flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono min-h-[36px] text-[#e74c3c] hover:text-[#ff6b6b] hover:bg-[#2a1515]">
            <RotateCcw size={14} /><span className="hidden md:inline">Reiniciar</span>
          </button>
        </div>

        {/* Nomes mostrem els controls de reproducció si estem en Animació */}
        {appMode === "animació" && (
          <>
            <div className="w-px h-6 bg-[#1e2d42] mx-1" />
            <div className="flex items-center gap-1">
              <button className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${playing ? "bg-[#1a2235] text-[#00d4d4]" : "bg-[#1a2235] text-[#f0f4f8] hover:text-[#00d4d4]"}`} onClick={togglePlay} title={playing ? "Pausa" : "Reproduir"}>
                {playing ? (
                  <svg width={14} height={14} fill="currentColor" viewBox="0 0 16 16"><rect x={3} y={2} width={4} height={12} rx={1} /><rect x={9} y={2} width={4} height={12} rx={1} /></svg>
                ) : (
                  <svg width={14} height={14} fill="currentColor" viewBox="0 0 16 16"><path d="M4 2l10 6-10 6V2z" /></svg>
                )}
              </button>
              <button className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#1a2235] text-[#8899aa] hover:text-[#f0f4f8] transition-colors" onClick={() => { setPlaying(false); setElapsed(0); setActiveFrame(0); }} title="Aturar">
                <svg width={12} height={12} fill="currentColor" viewBox="0 0 16 16"><rect x={2} y={2} width={12} height={12} rx={1} /></svg>
              </button>
              <div className="font-mono text-xs text-[#00d4d4] bg-[#0d1b2a] px-2.5 py-1.5 rounded border border-[#1e2d42] min-w-[110px] text-center tabular-nums">
                {formatTime(elapsed)} / {formatTime(totalDuration)}
              </div>
            </div>
          </>
        )}

        <div className="flex-1" />

        <div className="flex items-center rounded-lg border border-[#1e2d42] overflow-hidden mr-3">
          {([["full", "Completa"], ["half", "Mig camp"]] as const).map(([v, label]) => (
            <button
              key={v}
              disabled={exporting}
              onClick={() => { setPoolView(v); setContextMenu(null); setSelectedId(null); }}
              className={`px-2.5 py-1.5 text-xs min-h-[36px] transition-colors disabled:opacity-50 ${poolView === v ? "bg-[#00d4d4] text-[#0a0f1e] font-semibold" : "bg-[#1a2235] text-[#8899aa] hover:text-[#f0f4f8]"}`}
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
              onClick={() => { setAppMode(m); if (m === "pissarra") setPlaying(false); }}
              className={`px-3 py-1.5 text-xs min-h-[36px] transition-colors capitalize disabled:opacity-50 ${appMode === m ? "bg-[#00d4d4] text-[#0a0f1e] font-semibold" : "bg-[#1a2235] text-[#8899aa] hover:text-[#f0f4f8]"}`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Només mostrem opcions de trajectòries i exportar en mode Animació */}
        {appMode === "animació" && (
          <>
            <button onClick={() => setShowPaths(p => !p)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors min-h-[36px] mr-2 ${showPaths ? "bg-[#1a2235] text-[#00d4d4] border border-[#00d4d420]" : "btn-ghost"}`}>
              <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 16 16">
                <path d="M2 12 Q6 4 10 8 Q12 10 14 4" strokeLinecap="round" strokeDasharray="3 2" />
              </svg>
              <span className="hidden lg:inline">Trajectòries</span>
            </button>

            <div className="relative">
              <button disabled={exporting} onClick={() => setExportMenu(p => !p)} className="btn-export flex items-center gap-2 px-4 py-2 rounded-lg text-sm min-h-[36px] font-display tracking-wide disabled:opacity-50 disabled:cursor-wait">
                <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 16 16">
                  <path d="M8 2v9M5 8l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x={2} y={12} width={12} height={2} rx={1} fill="currentColor" stroke="none" />
                </svg>
                {exporting ? "Exportant…" : "Exportar MP4"}
              </button>
              {exportMenu && (
                <div className="absolute right-0 top-full mt-1 bg-[#1a2235] border border-[#2a3a55] rounded-lg shadow-2xl z-50 min-w-[140px]">
                  <div className="px-3 py-1.5 text-[10px] font-mono text-[#8899aa] uppercase tracking-wider border-b border-[#2a3a55]">Resolució</div>
                  {["720p HD", "1080p Full HD"].map(res => (
                    <button key={res} className="w-full text-left px-3 py-2.5 text-sm text-[#f0f4f8] hover:bg-[#243050] transition-colors flex items-center justify-between" onClick={() => startVideoExport(res)}>
                      <span>{res}</span>
                      <span className="text-[#8899aa] text-xs font-mono">{res.includes("1080") ? "1920×1080" : "1280×720"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 flex items-center justify-center bg-[#080e1c] p-3 overflow-hidden">
          <div className="relative rounded-xl overflow-hidden" style={{ width: `min(100%, calc((100vh - ${appMode === "animació" ? 220 : 90}px) * ${vw}/${vh}))`, aspectRatio: `${vw}/${vh}`, boxShadow:"0 0 0 1px #1e2d42, 0 8px 40px rgba(0,0,0,0.6), 0 0 60px rgba(0,212,212,0.05)" }}>
            <PoolCanvas 
              appMode={appMode} // <-- AFEGEIX AQUESTA LÍNIA (Passant el mode des de l'App)
              view={poolView} 
              frames={frames} 
              activeFrame={activeFrame} 
              selectedId={selectedId} 
              onSelectPlayer={setSelectedId} 
              onMovePlayer={updatePlayerPos} 
              onMoveBall={updateBallPos} 
              prevFrame={appMode === "animació" ? prevFrame : undefined} 
              showPaths={appMode === "animació" && showPaths} 
              contextMenu={contextMenu} 
              onContextMenu={(id, other, x, y) => setContextMenu({ id, other, x, y })} 
              onToggleAction={toggleAction} 
              onCloseContext={() => setContextMenu(null)} 
            />
            {exporting && <div className="absolute inset-0 z-40 cursor-wait" />}
          </div>
        </main>

        <aside className="w-[220px] shrink-0 bg-[#0d1b2a] border-l border-[#1e2d42] flex flex-col overflow-y-auto">
          <div className="p-3 border-b border-[#1e2d42]">
            <div className="text-[10px] font-mono text-[#4a5568] uppercase tracking-widest mb-2">Inspector</div>

            {selectedPlayer && selectedPos ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <svg width={32} height={32} viewBox="0 0 32 32" className="shrink-0">
                    <circle r={14} cx={16} cy={16} fill={selectedPlayer.team === "keeper" ? "#e74c3c" : selectedPlayer.team === "attack" ? "#ffffff" : "#1a3a6b"} />
                    <text textAnchor="middle" dominantBaseline="central" x={16} y={17} fontSize={14} fontWeight="800" fill={selectedPlayer.team === "attack" ? "#0a1525" : "#fff"} fontFamily="Barlow Condensed,sans-serif">{selectedPlayer.display}</text>
                  </svg>
                  <div>
                    <div className="font-display font-bold text-[#f0f4f8] text-base leading-none">{selectedPlayer.label}</div>
                    <div className="text-xs text-[#8899aa] capitalize mt-0.5">{selectedPlayer.team === "keeper" ? "Portera" : selectedPlayer.team === "attack" ? "Equip Local (Atac)" : "Equip Visitant (Defensa)"}</div>
                  </div>
                </div>

                {frame.actions.some(a => a.type === "exclusion" && a.defenderId === selectedId) && (
                  <div className="mb-3 bg-[#2a1515] border border-[#e74c3c] rounded px-2 py-1.5 flex items-center gap-2">
                    <span className="text-[#e74c3c] text-sm">⚡</span>
                    <span className="text-[#e74c3c] text-[10px] font-bold uppercase tracking-wider">Jugadora Expulsada</span>
                  </div>
                )}

                <div className="mb-2">
                  <div className="text-[10px] text-[#8899aa] font-mono mb-1.5">Possessió Pilota</div>
                  <div className={`w-full flex items-center gap-2 px-2.5 py-2 rounded text-xs font-medium border ${selectedPos.hasBall ? "bg-[#1a2e0a] border-[#ffdd1d40] text-[#ffdd1d]" : "bg-[#111827] border-[#1e2d42] text-[#8899aa]"}`}>
                    <svg width={10} height={10} viewBox="0 0 20 20" fill={selectedPos.hasBall ? "#ffdd1d" : "#4a5568"}><circle cx={10} cy={10} r={9} /></svg>
                    {selectedPos.hasBall ? "Té la pilota" : "Sense pilota"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 flex flex-col items-center">
                <Pointer size={28} className="text-[#2a3a55] mb-2" />
                <div className="text-xs text-[#4a5568]">Clica una jugadora per inspeccionar-la</div>
              </div>
            )}
          </div>

          <div className="p-3 flex-1">
            <div className="text-[10px] font-mono text-[#4a5568] uppercase tracking-widest mb-2">Banqueta</div>
            {[
              { label: "Atac (Local)", players: ROSTER_ATTACK, color: "#ffffff", borderColor: "#ccc" },
              { label: "Defensa (Visitant)", players: ROSTER_DEFENSE, color: "#1a3a6b", borderColor: "#0a1525" },
            ].map(({ label, players, color, borderColor }) => (
              <div key={label} className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-2 h-2 rounded-full border border-gray-500" style={{ background: color }} />
                  <span className="text-[10px] text-[#8899aa] font-display font-semibold uppercase tracking-wider">{label}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {players.map(p => {
                    const fill = p.team === "keeper" ? "#e74c3c" : color;
                    const textC = p.team === "attack" ? "#0a1525" : "#fff";
                    return (
                      <div key={p.id} 
                           onClick={() => setSelectedId(prev => prev === p.id ? null : p.id)}
                           title={`${label} ${p.display} (${p.label})`} 
                           className={`flex items-center justify-center w-8 h-8 rounded-full cursor-pointer hover:opacity-80 transition-all border-2 ${selectedId === p.id ? 'ring-2 ring-[#00d4d4] ring-offset-2 ring-offset-[#0d1b2a]' : ''}`} 
                           style={{ background: fill, borderColor: p.team === "keeper" ? "#c0392b" : borderColor }}>
                        <span className="font-display font-bold text-xs" style={{ color: textC }}>{p.display}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
      {appMode === "animació" && (
        <footer className="bg-[#0d1b2a] border-t border-[#1e2d42] shrink-0 flex flex-col justify-center" style={{ height: 130 }}>
          <div className="flex items-stretch h-full px-4 py-3 gap-0 overflow-x-auto">
            
            <div className="flex flex-col justify-center mr-4 shrink-0 min-w-[90px] gap-1 ml-8">
              <div className="text-[9px] font-mono text-[#4a5568] uppercase tracking-widest">Línia de temps</div>
              <div className="text-xs font-mono text-[#00d4d4]">{formatTime(elapsed)}</div>
              <div className="flex items-center gap-1 bg-[#0a1525] border border-[#1e2d42] px-1.5 py-0.5 rounded w-fit" title="Durada de cada frame">
                <input type="number" step="0.5" min="0.5" value={frameDuration}
                  onChange={e => changeFrameDuration(+e.target.value)}
                  className="w-10 bg-transparent text-[#00d4d4] font-mono text-xs outline-none text-right" />
                <span className="text-[#00d4d4] font-mono text-[10px]">s/frame</span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1 overflow-x-auto py-1 px-1">
              {frames.map((f, idx) => {
                return (
                  <div key={f.id} onClick={() => { setActiveFrame(idx); setElapsed(idx * frameDuration); }} className={`timeline-frame shrink-0 rounded-lg border-2 cursor-pointer overflow-hidden flex flex-col ${frameColor(idx)} w-[136px]`}>
                    <div className="flex-1 bg-[#0b2a4a] relative overflow-hidden">
                      <svg viewBox="0 0 100 58" width="100%" height="100%">
                        <rect width={100} height={58} fill="#0b2a4a" />
                        <line x1={50} y1={2} x2={50} y2={56} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
                        <rect x={2} y={2} width={96} height={54} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
                        <rect x={0} y={22} width={3} height={14} fill="rgba(255,255,255,0.5)" />
                        <rect x={97} y={22} width={3} height={14} fill="rgba(255,255,255,0.5)" />
                        {Object.entries(f.players).map(([id, pos]) => {
                          const player = ALL_PLAYERS.find(p => p.id === id)!;
                          const fill = player?.team === "keeper" ? "#e74c3c" : player?.team === "attack" ? "#ffffff" : "#1a3a6b";
                          return <circle key={id} cx={pos.x * 100 / POOL_W} cy={pos.y * 58 / POOL_H} r={3} fill={fill} />;
                        })}
                        <circle cx={f.ball.x * 100 / POOL_W} cy={f.ball.y * 58 / POOL_H} r={2.5} fill="#ffdd1d" />
                      </svg>
                      {idx === activeFrame && <div className="absolute inset-0 border-2 border-[#00d4d4] rounded pointer-events-none opacity-40" />}
                    </div>
                    <div className="bg-[#111827] px-2 py-1 flex items-center justify-between gap-1">
                      <span className="text-[9px] font-display font-semibold text-[#f0f4f8] truncate leading-tight">{f.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {frames.length > 1 && (
                          <button onClick={e => { e.stopPropagation(); deleteFrame(idx); }} className="text-[#4a5568] hover:text-[#e74c3c] flex items-center justify-center rounded hover:bg-[#2a1515] transition-colors p-0.5"><X size={12} /></button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <button onClick={addFrame} className="shrink-0 w-20 min-h-[90px] rounded-lg border-2 border-dashed border-[#1e2d42] hover:border-[#00d4d4] hover:bg-[#00d4d408] transition-colors flex flex-col items-center justify-center gap-1 text-[#4a5568] hover:text-[#00d4d4]">
                <Plus size={24} className="mb-1" strokeWidth={1.5} />
                <span className="text-[9px] font-mono uppercase tracking-wider">Nou Frame</span>
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}