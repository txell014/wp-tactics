import { useState, useRef, useCallback, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Team = "attack" | "defense" | "keeper";

interface Player {
  id: string;
  num: number;
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

interface FrameData {
  id: string;
  label: string;
  duration: number;
  players: Record<string, PlayerPos>;
  ball: BallPos;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POOL_W = 800;
const POOL_H = 460;

const ROSTER_ATTACK: Player[] = [
  { id: "a1", num: 1, team: "keeper", label: "GK" },
  { id: "a2", num: 2, team: "attack", label: "CF" },
  { id: "a3", num: 3, team: "attack", label: "LW" },
  { id: "a4", num: 4, team: "attack", label: "RW" },
  { id: "a5", num: 5, team: "attack", label: "CB" },
  { id: "a6", num: 6, team: "attack", label: "LF" },
  { id: "a7", num: 7, team: "attack", label: "RF" },
];

const ROSTER_DEFENSE: Player[] = [
  { id: "d1", num: 1, team: "keeper", label: "GK" },
  { id: "d2", num: 2, team: "defense", label: "CF" },
  { id: "d3", num: 3, team: "defense", label: "LW" },
  { id: "d4", num: 4, team: "defense", label: "RW" },
  { id: "d5", num: 5, team: "defense", label: "CB" },
  { id: "d6", num: 6, team: "defense", label: "LF" },
  { id: "d7", num: 7, team: "defense", label: "RF" },
];

const ALL_PLAYERS: Player[] = [...ROSTER_ATTACK, ...ROSTER_DEFENSE];

function makeDefaultPositions(): Record<string, PlayerPos> {
  return {
    a1: { x: 50, y: 230, angle: 0, hasBall: false },
    a2: { x: 580, y: 230, angle: 180, hasBall: true },
    a3: { x: 500, y: 130, angle: 220, hasBall: false },
    a4: { x: 500, y: 330, angle: 140, hasBall: false },
    a5: { x: 420, y: 230, angle: 180, hasBall: false },
    a6: { x: 450, y: 160, angle: 200, hasBall: false },
    a7: { x: 450, y: 300, angle: 160, hasBall: false },
    d1: { x: 750, y: 230, angle: 180, hasBall: false },
    d2: { x: 620, y: 230, angle: 0, hasBall: false },
    d3: { x: 560, y: 140, angle: 40, hasBall: false },
    d4: { x: 560, y: 320, angle: 320, hasBall: false },
    d5: { x: 660, y: 175, angle: 20, hasBall: false },
    d6: { x: 660, y: 285, angle: 340, hasBall: false },
    d7: { x: 700, y: 230, angle: 0, hasBall: false },
  };
}

function makeFrame(id: string, label: string, dur: number, prev?: FrameData): FrameData {
  return {
    id,
    label,
    duration: dur,
    players: prev ? JSON.parse(JSON.stringify(prev.players)) : makeDefaultPositions(),
    ball: prev ? { ...prev.ball } : { x: 580, y: 230 },
  };
}

const INITIAL_FRAMES: FrameData[] = [
  makeFrame("f1", "Initial Setup", 2.5),
  makeFrame("f2", "Drive & Pass", 2.0),
  makeFrame("f3", "Shot on Goal", 1.5),
];
// Give frame 2 a slight variation
INITIAL_FRAMES[1].players.a2 = { x: 620, y: 200, angle: 160, hasBall: false };
INITIAL_FRAMES[1].players.a3 = { x: 540, y: 110, angle: 200, hasBall: true };
INITIAL_FRAMES[1].ball = { x: 540, y: 110 };

INITIAL_FRAMES[2].players.a3 = { x: 600, y: 100, angle: 180, hasBall: false };
INITIAL_FRAMES[2].players.a2 = { x: 680, y: 200, angle: 140, hasBall: true };
INITIAL_FRAMES[2].ball = { x: 690, y: 195 };

// ─── Sub-components ───────────────────────────────────────────────────────────

function TeamColor({ team, keeper }: { team: Team; keeper?: boolean }) {
  if (team === "keeper" || keeper) return "#e74c3c";
  if (team === "attack") return "#4a90d9";
  return "#1a3a6b";
}

function PlayerTokenSVG({
  player,
  pos,
  selected,
  isOnCanvas,
}: {
  player: Player;
  pos: PlayerPos;
  selected: boolean;
  isOnCanvas: boolean;
}) {
  const fill = player.team === "keeper" ? "#e74c3c" : player.team === "attack" ? "#4a90d9" : "#1a3a6b";
  const stroke = selected ? "#00d4d4" : player.team === "attack" ? "#7ab8f0" : "#5577aa";
  const capStripes = player.team === "attack" ? "#2060b0" : player.team === "keeper" ? "#c0392b" : "#102060";

  return (
    <g transform={`translate(${pos.x},${pos.y})`} style={{ cursor: "grab" }}>
      {selected && (
        <circle r={24} fill="none" stroke="#00d4d4" strokeWidth={2} strokeDasharray="4 3" opacity={0.8} />
      )}
      {/* Direction arrow */}
      <g transform={`rotate(${pos.angle})`}>
        <line x1={0} y1={-14} x2={0} y2={-20} stroke={selected ? "#00d4d4" : "#aabbcc"} strokeWidth={2} strokeLinecap="round" />
        <polygon points="0,-24 -4,-18 4,-18" fill={selected ? "#00d4d4" : "#aabbcc"} />
      </g>
      {/* Cap shadow */}
      <circle r={15} fill="rgba(0,0,0,0.3)" cx={1} cy={2} />
      {/* Cap body */}
      <circle r={15} fill={fill} stroke={stroke} strokeWidth={selected ? 2.5 : 1.5} />
      {/* Cap stripes */}
      <path d={`M-15,0 Q0,-${player.team === "keeper" ? 18 : 15} 15,0`} fill="none" stroke={capStripes} strokeWidth={2.5} />
      <path d={`M-12,-7 Q0,-${player.team === "keeper" ? 22 : 19} 12,-7`} fill="none" stroke={capStripes} strokeWidth={1.5} />
      {/* Number */}
      <text textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight="700" fontFamily="Barlow Condensed,sans-serif" fill="#fff" y={1}>
        {player.num}
      </text>
      {/* Ball indicator */}
      {pos.hasBall && (
        <circle r={5} cx={12} cy={-12} fill="#b8ff2e" stroke="#0a0f1e" strokeWidth={1.5} />
      )}
    </g>
  );
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
  onCloseContext,
}: {
  frames: FrameData[];
  activeFrame: number;
  selectedId: string | null;
  onSelectPlayer: (id: string | null) => void;
  onMovePlayer: (id: string, x: number, y: number) => void;
  onMoveBall: (x: number, y: number) => void;
  prevFrame?: FrameData;
  showPaths: boolean;
  contextMenu: { id: string; x: number; y: number } | null;
  onContextMenu: (id: string, x: number, y: number) => void;
  onCloseContext: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<{ id: string; type: "player" | "ball"; ox: number; oy: number } | null>(null);
  const frame = frames[activeFrame];

  function toSVGCoords(e: React.MouseEvent | MouseEvent) {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const scaleX = POOL_W / rect.width;
    const scaleY = POOL_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function onMouseDown(e: React.MouseEvent, id: string, type: "player" | "ball") {
    e.stopPropagation();
    onSelectPlayer(id === "ball" ? null : id);
    onCloseContext();
    const { x, y } = toSVGCoords(e);
    const pos = type === "ball" ? frame.ball : frame.players[id];
    draggingRef.current = { id, type, ox: x - pos.x, oy: y - pos.y };
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current || !svgRef.current) return;
      const { x, y } = toSVGCoords(e);
      const nx = Math.max(15, Math.min(POOL_W - 15, x - draggingRef.current.ox));
      const ny = Math.max(15, Math.min(POOL_H - 15, y - draggingRef.current.oy));
      if (draggingRef.current.type === "ball") {
        onMoveBall(nx, ny);
      } else {
        onMovePlayer(draggingRef.current.id, nx, ny);
      }
    }
    function onUp() {
      draggingRef.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  });

  // Check proximity for context menu trigger
  function checkProximity(id: string, e: React.MouseEvent) {
    if (!frame) return;
    const pos = frame.players[id];
    const opponentIds = id.startsWith("a") ? Object.keys(frame.players).filter(k => k.startsWith("d")) : Object.keys(frame.players).filter(k => k.startsWith("a"));
    for (const oid of opponentIds) {
      const op = frame.players[oid];
      const dist = Math.hypot(pos.x - op.x, pos.y - op.y);
      if (dist < 40) {
        onContextMenu(id, e.clientX, e.clientY);
        return;
      }
    }
  }

  const poolBlue = "#0b2a4a";
  const lineColor = "rgba(255,255,255,0.5)";

  return (
    <div className="relative w-full h-full" onClick={() => { onSelectPlayer(null); onCloseContext(); }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${POOL_W} ${POOL_H}`}
        className="w-full h-full"
        style={{ display: "block" }}
      >
        {/* Pool background */}
        <defs>
          <linearGradient id="poolGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0b3a6a" />
            <stop offset="50%" stopColor="#0d4a7a" />
            <stop offset="100%" stopColor="#0a2a55" />
          </linearGradient>
          <filter id="ballGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="tokenShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Pool water */}
        <rect x={0} y={0} width={POOL_W} height={POOL_H} fill="url(#poolGrad)" rx={4} />

        {/* Lane lines subtle */}
        {[80, 160, 240, 320, 400].map(y => (
          <line key={y} x1={30} y1={y} x2={POOL_W - 30} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}

        {/* Boundary */}
        <rect x={20} y={20} width={POOL_W - 40} height={POOL_H - 40} fill="none" stroke={lineColor} strokeWidth={2} />

        {/* Half line (white) */}
        <line x1={POOL_W / 2} y1={20} x2={POOL_W / 2} y2={POOL_H - 20} stroke="rgba(255,255,255,0.7)" strokeWidth={2} />

        {/* 5m lines (yellow) - both sides */}
        {[20 + (POOL_W - 40) * (5 / 30), POOL_W - 20 - (POOL_W - 40) * (5 / 30)].map((x, i) => (
          <line key={i} x1={x} y1={20} x2={x} y2={POOL_H - 20} stroke="#f0c040" strokeWidth={1.5} opacity={0.8} />
        ))}

        {/* 2m lines (red) - both sides */}
        {[20 + (POOL_W - 40) * (2 / 30), POOL_W - 20 - (POOL_W - 40) * (2 / 30)].map((x, i) => (
          <line key={i} x1={x} y1={20} x2={x} y2={POOL_H - 20} stroke="#e74c3c" strokeWidth={1.5} opacity={0.8} />
        ))}

        {/* Goals */}
        {[20, POOL_W - 20].map((gx, i) => {
          const goalW = i === 0 ? 8 : -8;
          const goalY1 = POOL_H / 2 - 35;
          const goalY2 = POOL_H / 2 + 35;
          return (
            <g key={i}>
              <rect
                x={i === 0 ? gx - 2 : gx - 6}
                y={goalY1}
                width={8}
                height={70}
                fill="rgba(255,255,255,0.08)"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth={1.5}
              />
              {/* Net grid */}
              {[0, 14, 28, 42, 56, 70].map(dy => (
                <line key={dy} x1={i === 0 ? gx - 2 : gx - 6} y1={goalY1 + dy} x2={i === 0 ? gx + 6 : gx + 2} y2={goalY1 + dy} stroke="rgba(255,255,255,0.25)" strokeWidth={0.5} />
              ))}
              {[0, 4].map(dx => (
                <line key={dx} x1={i === 0 ? gx - 2 + dx * 2 : gx - 6 + dx * 2} y1={goalY1} x2={i === 0 ? gx - 2 + dx * 2 : gx - 6 + dx * 2} y2={goalY2} stroke="rgba(255,255,255,0.25)" strokeWidth={0.5} />
              ))}
              {/* Goal posts */}
              <circle r={3} cx={i === 0 ? gx + 6 : gx - 6} cy={goalY1} fill="#fff" opacity={0.9} />
              <circle r={3} cx={i === 0 ? gx + 6 : gx - 6} cy={goalY2} fill="#fff" opacity={0.9} />
            </g>
          );
        })}

        {/* Line labels */}
        <text x={POOL_W / 2} y={14} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.4)" fontFamily="JetBrains Mono">HALF</text>

        {/* Motion paths from prev frame */}
        {showPaths && prevFrame && Object.keys(frame.players).map(id => {
          const cur = frame.players[id];
          const prev = prevFrame.players[id];
          if (!prev || (Math.abs(cur.x - prev.x) < 5 && Math.abs(cur.y - prev.y) < 5)) return null;
          const player = ALL_PLAYERS.find(p => p.id === id)!;
          const color = player?.team === "attack" ? "#4a90d9" : "#c0392b";
          const mx = (prev.x + cur.x) / 2 + (cur.y - prev.y) * 0.3;
          const my = (prev.y + cur.y) / 2 - (cur.x - prev.x) * 0.3;
          return (
            <path
              key={id}
              d={`M${prev.x},${prev.y} Q${mx},${my} ${cur.x},${cur.y}`}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              opacity={0.5}
              className="motion-path"
            />
          );
        })}

        {/* Ball motion path */}
        {showPaths && prevFrame && (() => {
          const cur = frame.ball;
          const prev = prevFrame.ball;
          if (Math.abs(cur.x - prev.x) < 5 && Math.abs(cur.y - prev.y) < 5) return null;
          const mx = (prev.x + cur.x) / 2 + (cur.y - prev.y) * 0.4;
          const my = (prev.y + cur.y) / 2 - (cur.x - prev.x) * 0.4;
          return (
            <path
              d={`M${prev.x},${prev.y} Q${mx},${my} ${cur.x},${cur.y}`}
              fill="none"
              stroke="#b8ff2e"
              strokeWidth={2}
              opacity={0.6}
              className="motion-path"
            />
          );
        })()}

        {/* Players */}
        {ALL_PLAYERS.map(player => {
          const pos = frame.players[player.id];
          if (!pos) return null;
          return (
            <g
              key={player.id}
              filter="url(#tokenShadow)"
              onMouseDown={e => { e.stopPropagation(); onSelectPlayer(player.id); onMouseDown(e, player.id, "player"); checkProximity(player.id, e); }}
              className="player-token"
            >
              <PlayerTokenSVG player={player} pos={pos} selected={selectedId === player.id} isOnCanvas />
            </g>
          );
        })}

        {/* Ball */}
        <g
          filter="url(#ballGlow)"
          onMouseDown={e => { e.stopPropagation(); onMouseDown(e, "ball", "ball"); }}
          style={{ cursor: "grab" }}
        >
          <circle r={10} cx={frame.ball.x} cy={frame.ball.y} fill="rgba(184,255,46,0.15)" />
          <circle r={9} cx={frame.ball.x} cy={frame.ball.y} fill="#b8ff2e" />
          <circle r={9} cx={frame.ball.x} cy={frame.ball.y} fill="none" stroke="#8acc20" strokeWidth={1.5} />
          {/* Ball texture lines */}
          <path d={`M${frame.ball.x - 5},${frame.ball.y - 7} Q${frame.ball.x},${frame.ball.y - 4} ${frame.ball.x + 5},${frame.ball.y - 7}`} fill="none" stroke="#0a0f1e" strokeWidth={1} opacity={0.4} />
          <path d={`M${frame.ball.x - 7},${frame.ball.y} Q${frame.ball.x},${frame.ball.y + 3} ${frame.ball.x + 7},${frame.ball.y}`} fill="none" stroke="#0a0f1e" strokeWidth={1} opacity={0.4} />
          <circle r={3} cx={frame.ball.x - 3} cy={frame.ball.y - 4} fill="rgba(255,255,255,0.4)" />
        </g>

        {/* Legend */}
        <g transform={`translate(${POOL_W - 120}, ${POOL_H - 65})`}>
          <rect x={0} y={0} width={100} height={58} rx={4} fill="rgba(10,15,30,0.7)" />
          {[
            { color: "#4a90d9", label: "Attack" },
            { color: "#1a3a6b", label: "Defense" },
            { color: "#e74c3c", label: "Goalkeeper" },
          ].map(({ color, label }, i) => (
            <g key={label} transform={`translate(8, ${i * 17 + 10})`}>
              <circle r={5} cx={5} cy={0} fill={color} />
              <text x={15} y={4} fontSize={9} fill="rgba(255,255,255,0.6)" fontFamily="Inter,sans-serif">{label}</text>
            </g>
          ))}
        </g>
      </svg>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="context-menu absolute z-50 bg-[#1a2235] border border-[#2a3a55] rounded-lg shadow-2xl p-1 min-w-[180px]"
          style={{ left: contextMenu.x - (svgRef.current?.getBoundingClientRect().left ?? 0), top: contextMenu.y - (svgRef.current?.getBoundingClientRect().top ?? 0) - 10 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-mono text-[#8899aa] uppercase tracking-wider border-b border-[#2a3a55] mb-1">Tactical Action</div>
          {[
            { icon: "↻", label: "Turn Defender", color: "#00d4d4" },
            { icon: "⚡", label: "Draw Exclusion / Foul", color: "#e74c3c" },
            { icon: "✋", label: "Hold / Block", color: "#f0c040" },
          ].map(({ icon, label, color }) => (
            <button
              key={label}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-left hover:bg-[#243050] transition-colors"
              onClick={onCloseContext}
            >
              <span style={{ color, fontSize: 14 }}>{icon}</span>
              <span className="text-[#f0f4f8]">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [frames, setFrames] = useState<FrameData[]>(INITIAL_FRAMES);
  const [activeFrame, setActiveFrame] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playTitle, setPlayTitle] = useState("Home vs Away — 6-on-5 Overtime Play");
  const [editingTitle, setEditingTitle] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [looping, setLooping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showPaths, setShowPaths] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [ballFree, setBallFree] = useState(false);
  const [exportMenu, setExportMenu] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const frame = frames[activeFrame];
  const selectedPlayer = selectedId ? ALL_PLAYERS.find(p => p.id === selectedId) : null;
  const selectedPos = selectedId ? frame.players[selectedId] : null;

  const totalDuration = frames.reduce((s, f) => s + f.duration, 0);

  // Playback
  useEffect(() => {
    if (playing) {
      playIntervalRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 0.1;
          if (next >= totalDuration) {
            if (looping) return 0;
            setPlaying(false);
            return totalDuration;
          }
          // sync active frame
          let acc = 0;
          for (let i = 0; i < frames.length; i++) {
            acc += frames[i].duration;
            if (next < acc) { setActiveFrame(i); break; }
          }
          return next;
        });
      }, 100);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [playing, looping, frames, totalDuration]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toFixed(1).padStart(4, "0");
    return `${m}:${sec}`;
  }

  function updatePlayerPos(id: string, x: number, y: number) {
    setFrames(prev => prev.map((f, i) =>
      i !== activeFrame ? f : { ...f, players: { ...f.players, [id]: { ...f.players[id], x, y } } }
    ));
  }

  function updateBallPos(x: number, y: number) {
    setFrames(prev => prev.map((f, i) =>
      i !== activeFrame ? f : { ...f, ball: { x, y } }
    ));
  }

  function updatePlayerAngle(id: string, angle: number) {
    setFrames(prev => prev.map((f, i) =>
      i !== activeFrame ? f : { ...f, players: { ...f.players, [id]: { ...f.players[id], angle } } }
    ));
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

  function addFrame() {
    const newFrame = makeFrame(`f${Date.now()}`, `Frame ${frames.length + 1}`, 2.0, frames[frames.length - 1]);
    setFrames(prev => [...prev, newFrame]);
    setActiveFrame(frames.length);
  }

  function deleteFrame(idx: number) {
    if (frames.length <= 1) return;
    setFrames(prev => prev.filter((_, i) => i !== idx));
    setActiveFrame(prev => Math.max(0, prev >= idx ? prev - 1 : prev));
  }

  function resetPlay() {
    setFrames(INITIAL_FRAMES.map(f => makeFrame(f.id, f.label, f.duration)));
    setActiveFrame(0);
    setElapsed(0);
    setPlaying(false);
  }

  const prevFrame = activeFrame > 0 ? frames[activeFrame - 1] : undefined;

  // Mini thumbnail helper colors
  function frameColor(idx: number) {
    return idx === activeFrame ? "border-[#00d4d4]" : "border-[#1e2d42]";
  }

  // Lògica per enregistrar l'animació a vídeo
  const startVideoExport = async (resolution: string) => {
    setExportMenu(false);
    
    // Tornem a l'inici de la jugada
    setActiveFrame(0);
    setElapsed(0);
    
    // Esperem un instant perquè s'actualitzi la UI
    await new Promise(r => setTimeout(r, 100));
    
    const svgElement = document.querySelector('svg');
    if (!svgElement) return;

    // Creem un canvas ocult per processar els fotogrames
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Resolució segons l'opció triada
    const width = resolution.includes("1080") ? 1920 : 1280;
    const height = resolution.includes("1080") ? 1080 : 720;
    canvas.width = width;
    canvas.height = height;

    // Preparem la gravació
    const stream = canvas.captureStream(30); // 30 FPS
    // Fem servir WebM o MP4 segons el navegador suporti
    const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
                     ? 'video/webm; codecs=vp9' 
                     : 'video/mp4'; 
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${playTitle.replace(/\s+/g, '_')}_Export.mp4`; // Extensió de descàrrega
      a.click();
      URL.revokeObjectURL(url);
    };

    recorder.start();
    setPlaying(true); // Comencem a reproduir la línia de temps automàticament

    // Bucle de dibuixat en temps real
    const renderLoop = setInterval(() => {
      // Converteix l'SVG actual a imatge i la dibuixa al Canvas
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const img = new Image();
      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = '#080e1c'; // Fons
          ctx.fillRect(0, 0, width, height);
          
          // Mantenim la proporció de l'SVG al centre del vídeo
          const scale = Math.min(width / 800, height / 460);
          const drawW = 800 * scale;
          const drawH = 460 * scale;
          const offsetX = (width - drawW) / 2;
          const offsetY = (height - drawH) / 2;
          
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        }
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }, 1000 / 30); // 30 fps

    // Aturem la gravació quan la jugada arriba al final
    const stopCheck = setInterval(() => {
      setElapsed((currentElapsed) => {
        if (currentElapsed >= totalDuration) {
          clearInterval(renderLoop);
          clearInterval(stopCheck);
          recorder.stop();
          setPlaying(false);
        }
        return currentElapsed;
      });
    }, 200);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0f1e] overflow-hidden select-none">

      {/* ── Top Nav ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-2 bg-[#0d1b2a] border-b border-[#1e2d42] shrink-0" style={{ minHeight: 52 }}>
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <svg width={28} height={28} viewBox="0 0 28 28">
            <rect width={28} height={28} rx={6} fill="#00d4d4" opacity={0.15} />
            <circle cx={14} cy={14} r={8} fill="none" stroke="#00d4d4" strokeWidth={2} />
            <path d="M6,14 Q14,8 22,14" fill="none" stroke="#00d4d4" strokeWidth={1.5} />
            <circle cx={14} cy={14} r={3} fill="#b8ff2e" />
          </svg>
          <span className="font-display text-[#00d4d4] font-bold text-sm tracking-wider uppercase hidden sm:block">AquaTac</span>
        </div>

        {/* Title */}
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
            <button
              className="flex items-center gap-1.5 group max-w-sm"
              onClick={() => setEditingTitle(true)}
            >
              <span className="font-display font-semibold text-sm text-[#f0f4f8] tracking-wide truncate">{playTitle}</span>
              <span className="text-[#4a5568] group-hover:text-[#8899aa] text-xs">✎</span>
            </button>
          )}
        </div>

        {/* Edit actions */}
        <div className="flex items-center gap-1">
          {[{ label: "Undo", icon: "↩" }, { label: "Redo", icon: "↪" }].map(({ label, icon }) => (
            <button key={label} className="btn-ghost flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono min-h-[36px]" title={label}>
              <span>{icon}</span>
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
          <button onClick={resetPlay} className="btn-ghost flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-mono min-h-[36px] text-[#e74c3c] hover:text-[#ff6b6b] hover:bg-[#2a1515]">
            <span>⟳</span>
            <span className="hidden md:inline">Reset</span>
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-[#1e2d42]" />

        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <button
            className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${playing ? "bg-[#1a2235] text-[#00d4d4]" : "bg-[#1a2235] text-[#f0f4f8] hover:text-[#00d4d4]"}`}
            onClick={() => setPlaying(p => !p)}
            title={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg width={14} height={14} fill="currentColor" viewBox="0 0 16 16"><rect x={3} y={2} width={4} height={12} rx={1} /><rect x={9} y={2} width={4} height={12} rx={1} /></svg>
            ) : (
              <svg width={14} height={14} fill="currentColor" viewBox="0 0 16 16"><path d="M4 2l10 6-10 6V2z" /></svg>
            )}
          </button>
          <button
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#1a2235] text-[#8899aa] hover:text-[#f0f4f8] transition-colors"
            onClick={() => { setPlaying(false); setElapsed(0); setActiveFrame(0); }}
            title="Stop"
          >
            <svg width={12} height={12} fill="currentColor" viewBox="0 0 16 16"><rect x={2} y={2} width={12} height={12} rx={1} /></svg>
          </button>
          <button
            className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${looping ? "bg-[#00d4d4] text-[#0a0f1e]" : "bg-[#1a2235] text-[#8899aa] hover:text-[#f0f4f8]"}`}
            onClick={() => setLooping(l => !l)}
            title="Loop"
          >
            <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 16 16">
              <path d="M2 8a6 6 0 0110.5-3.9" strokeLinecap="round" />
              <path d="M14 8a6 6 0 01-10.5 3.9" strokeLinecap="round" />
              <path d="M11 2l2.5 2.1L11 6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 10l-2.5 1.9L5 14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* Timestamp */}
          <div className="font-mono text-xs text-[#00d4d4] bg-[#0d1b2a] px-2.5 py-1.5 rounded border border-[#1e2d42] min-w-[110px] text-center tabular-nums">
            {formatTime(elapsed)} / {formatTime(totalDuration)}
          </div>
        </div>

        <div className="flex-1" />

        {/* Paths toggle */}
        <button
          onClick={() => setShowPaths(p => !p)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors min-h-[36px] ${showPaths ? "bg-[#1a2235] text-[#00d4d4] border border-[#00d4d420]" : "btn-ghost"}`}
        >
          <svg width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 16 16">
            <path d="M2 12 Q6 4 10 8 Q12 10 14 4" strokeLinecap="round" strokeDasharray="3 2" />
          </svg>
          <span className="hidden lg:inline">Paths</span>
        </button>

        {/* Export button */}
        <div className="relative">
          <button
            onClick={() => setExportMenu(p => !p)}
            className="btn-export flex items-center gap-2 px-4 py-2 rounded-lg text-sm min-h-[36px] font-display tracking-wide"
          >
            <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 16 16">
              <path d="M8 2v9M5 8l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
              <rect x={2} y={12} width={12} height={2} rx={1} fill="currentColor" stroke="none" />
            </svg>
            Export MP4
          </button>
          {exportMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[#1a2235] border border-[#2a3a55] rounded-lg shadow-2xl z-50 min-w-[140px]">
              <div className="px-3 py-1.5 text-[10px] font-mono text-[#8899aa] uppercase tracking-wider border-b border-[#2a3a55]">Resolution</div>
              {["720p HD", "1080p Full HD"].map(res => (
                <button
                  key={res}
                  className="w-full text-left px-3 py-2.5 text-sm text-[#f0f4f8] hover:bg-[#243050] transition-colors flex items-center justify-between"
                  onClick={() => startVideoExport(res)}
                >
                  <span>{res}</span>
                  <span className="text-[#8899aa] text-xs font-mono">{res.includes("1080") ? "1920×1080" : "1280×720"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Pool Canvas */}
        <main className="flex-1 flex items-center justify-center bg-[#080e1c] p-3 overflow-hidden">
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              width: "min(calc(100%), calc((100vh - 180px) * 800/460))",
              aspectRatio: "800/460",
              boxShadow: "0 0 0 1px #1e2d42, 0 8px 40px rgba(0,0,0,0.6), 0 0 60px rgba(0,212,212,0.05)",
            }}
          >
            <PoolCanvas
              frames={frames}
              activeFrame={activeFrame}
              selectedId={selectedId}
              onSelectPlayer={setSelectedId}
              onMovePlayer={updatePlayerPos}
              onMoveBall={updateBallPos}
              prevFrame={prevFrame}
              showPaths={showPaths}
              contextMenu={contextMenu}
              onContextMenu={(id, x, y) => setContextMenu({ id, x, y })}
              onCloseContext={() => setContextMenu(null)}
            />
          </div>
        </main>

        {/* ── Right Sidebar ──────────────────────────────────────────────────── */}
        <aside className="w-[220px] shrink-0 bg-[#0d1b2a] border-l border-[#1e2d42] flex flex-col overflow-y-auto">

          {/* Selection panel */}
          <div className="p-3 border-b border-[#1e2d42]">
            <div className="text-[10px] font-mono text-[#4a5568] uppercase tracking-widest mb-2">Inspector</div>

            {selectedPlayer && selectedPos ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <svg width={32} height={32} viewBox="0 0 32 32">
                    <circle
                      r={14}
                      cx={16}
                      cy={16}
                      fill={selectedPlayer.team === "keeper" ? "#e74c3c" : selectedPlayer.team === "attack" ? "#4a90d9" : "#1a3a6b"}
                    />
                    <text textAnchor="middle" dominantBaseline="central" x={16} y={17} fontSize={11} fontWeight="700" fill="#fff" fontFamily="Barlow Condensed,sans-serif">{selectedPlayer.num}</text>
                  </svg>
                  <div>
                    <div className="font-display font-bold text-[#f0f4f8] text-base leading-none">{selectedPlayer.label} #{selectedPlayer.num}</div>
                    <div className="text-xs text-[#8899aa] capitalize mt-0.5">{selectedPlayer.team === "keeper" ? "Goalkeeper" : selectedPlayer.team === "attack" ? "Attack Team" : "Defense Team"}</div>
                  </div>
                </div>

                {/* Position */}
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {[{ label: "X", val: selectedPos.x }, { label: "Y", val: selectedPos.y }].map(({ label, val }) => (
                    <div key={label} className="bg-[#111827] rounded p-1.5">
                      <div className="text-[9px] text-[#4a5568] font-mono mb-0.5">{label}</div>
                      <div className="text-xs font-mono text-[#00d4d4]">{val.toFixed(0)}</div>
                    </div>
                  ))}
                </div>

                {/* Orientation */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-[#8899aa] font-mono">Orientation</span>
                    <span className="text-[10px] font-mono text-[#00d4d4]">{selectedPos.angle}°</span>
                  </div>
                  <input
                    type="range" min={0} max={360}
                    value={selectedPos.angle}
                    onChange={e => updatePlayerAngle(selectedId!, +e.target.value)}
                    className="w-full"
                  />
                  {/* Radial preview */}
                  <div className="flex justify-center mt-2">
                    <svg width={48} height={48} viewBox="0 0 48 48">
                      <circle cx={24} cy={24} r={20} fill="#111827" stroke="#1e2d42" strokeWidth={1} />
                      <circle cx={24} cy={24} r={3} fill="#1e2d42" />
                      <line
                        x1={24} y1={24}
                        x2={24 + 15 * Math.sin(selectedPos.angle * Math.PI / 180)}
                        y2={24 - 15 * Math.cos(selectedPos.angle * Math.PI / 180)}
                        stroke="#00d4d4" strokeWidth={2} strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Ball possession */}
                <div className="mb-2">
                  <div className="text-[10px] text-[#8899aa] font-mono mb-1.5">Ball Possession</div>
                  <button
                    onClick={() => toggleBallPossession(selectedId!)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded text-xs font-medium transition-colors ${selectedPos.hasBall ? "bg-[#1a2e0a] border border-[#b8ff2e40] text-[#b8ff2e]" : "bg-[#111827] border border-[#1e2d42] text-[#8899aa] hover:text-[#f0f4f8]"}`}
                  >
                    <circle r={4} cx={5} cy={5} />
                    <svg width={10} height={10} viewBox="0 0 20 20" fill={selectedPos.hasBall ? "#b8ff2e" : "#4a5568"}>
                      <circle cx={10} cy={10} r={9} />
                    </svg>
                    {selectedPos.hasBall ? "Ball in hand" : "Free / Passing"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-[#2a3a55] text-3xl mb-2">⬤</div>
                <div className="text-xs text-[#4a5568]">Click a player to inspect</div>
              </div>
            )}
          </div>

          {/* Transition settings */}
          <div className="p-3 border-b border-[#1e2d42]">
            <div className="text-[10px] font-mono text-[#4a5568] uppercase tracking-widest mb-2">Transition</div>
            <div className="bg-[#111827] rounded p-2 mb-2">
              <div className="text-xs text-[#f0f4f8] mb-1">Water Drag Easing</div>
              <svg width="100%" height={28} viewBox="0 0 160 28">
                <path d="M8 22 C30 22 60 6 152 6" fill="none" stroke="#00d4d4" strokeWidth={2} strokeLinecap="round" />
                <circle cx={8} cy={22} r={3} fill="#00d4d4" />
                <circle cx={152} cy={6} r={3} fill="#00d4d4" />
              </svg>
              <div className="text-[9px] text-[#4a5568] font-mono">ease-out cubic · smooth</div>
            </div>
          </div>

          {/* Team Roster Bench */}
          <div className="p-3 flex-1">
            <div className="text-[10px] font-mono text-[#4a5568] uppercase tracking-widest mb-2">Bench Roster</div>

            {[
              { label: "Attack", players: ROSTER_ATTACK, color: "#4a90d9" },
              { label: "Defense", players: ROSTER_DEFENSE, color: "#1a3a6b" },
            ].map(({ label, players, color }) => (
              <div key={label} className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] text-[#8899aa] font-display font-semibold uppercase tracking-wider">{label}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {players.map(p => {
                    const fill = p.team === "keeper" ? "#e74c3c" : color;
                    return (
                      <div
                        key={p.id}
                        title={`${label} #${p.num} (${p.label})`}
                        className="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer hover:opacity-80 transition-opacity border-2"
                        style={{ background: fill, borderColor: p.team === "keeper" ? "#ff8080" : color === "#4a90d9" ? "#7ab8f0" : "#5577aa" }}
                      >
                        <span className="font-display font-bold text-white text-xs">{p.num}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* ── Bottom Timeline ──────────────────────────────────────────────────── */}
      <footer className="bg-[#0d1b2a] border-t border-[#1e2d42] shrink-0" style={{ height: 110 }}>
        <div className="flex items-stretch h-full px-3 gap-0 overflow-x-auto">

          {/* Playhead + label col */}
          <div className="flex flex-col justify-center mr-3 shrink-0 min-w-[60px]">
            <div className="text-[9px] font-mono text-[#4a5568] uppercase tracking-widest mb-1">Timeline</div>
            <div className="text-xs font-mono text-[#00d4d4]">{formatTime(elapsed)}</div>
          </div>

          {/* Frames */}
          <div className="flex items-center gap-2 flex-1 overflow-x-auto py-2">
            {frames.map((f, idx) => {
              // Compute position within timeline
              const widthRatio = f.duration / totalDuration;
              return (
                <div
                  key={f.id}
                  onClick={() => { setActiveFrame(idx); setElapsed(frames.slice(0, idx).reduce((s, fr) => s + fr.duration, 0)); }}
                  className={`timeline-frame shrink-0 rounded-lg border-2 cursor-pointer overflow-hidden flex flex-col ${frameColor(idx)}`}
                  style={{ width: Math.max(100, widthRatio * 500), minHeight: 80 }}
                >
                  {/* Mini preview */}
                  <div className="flex-1 bg-[#0b2a4a] relative overflow-hidden">
                    {/* Pool preview SVG */}
                    <svg viewBox="0 0 100 58" width="100%" height="100%">
                      <rect width={100} height={58} fill="#0b2a4a" />
                      <line x1={50} y1={2} x2={50} y2={56} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
                      <rect x={2} y={2} width={96} height={54} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
                      {/* Goals */}
                      <rect x={0} y={22} width={3} height={14} fill="rgba(255,255,255,0.5)" />
                      <rect x={97} y={22} width={3} height={14} fill="rgba(255,255,255,0.5)" />
                      {/* Players */}
                      {Object.entries(f.players).map(([id, pos]) => {
                        const player = ALL_PLAYERS.find(p => p.id === id)!;
                        const fill = player?.team === "keeper" ? "#e74c3c" : player?.team === "attack" ? "#4a90d9" : "#1a3a6b";
                        return <circle key={id} cx={pos.x * 100 / POOL_W} cy={pos.y * 58 / POOL_H} r={3} fill={fill} />;
                      })}
                      {/* Ball */}
                      <circle cx={f.ball.x * 100 / POOL_W} cy={f.ball.y * 58 / POOL_H} r={2.5} fill="#b8ff2e" />
                    </svg>
                    {idx === activeFrame && (
                      <div className="absolute inset-0 border-2 border-[#00d4d4] rounded pointer-events-none opacity-40" />
                    )}
                  </div>
                  {/* Frame meta */}
                  <div className="bg-[#111827] px-2 py-1 flex items-center justify-between gap-1">
                    <span className="text-[9px] font-display font-semibold text-[#f0f4f8] truncate leading-tight">{f.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-mono text-[9px] text-[#00d4d4] bg-[#0a1525] px-1 py-0.5 rounded">{f.duration}s</span>
                      {frames.length > 1 && (
                        <button
                          onClick={e => { e.stopPropagation(); deleteFrame(idx); }}
                          className="text-[#4a5568] hover:text-[#e74c3c] text-[10px] w-4 h-4 flex items-center justify-center rounded hover:bg-[#2a1515] transition-colors"
                        >×</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add frame button */}
            <button
              onClick={addFrame}
              className="shrink-0 w-20 min-h-[80px] rounded-lg border-2 border-dashed border-[#1e2d42] hover:border-[#00d4d4] hover:bg-[#00d4d408] transition-colors flex flex-col items-center justify-center gap-1 text-[#4a5568] hover:text-[#00d4d4]"
            >
              <span className="text-2xl font-light leading-none">+</span>
              <span className="text-[9px] font-mono uppercase tracking-wider">Add Frame</span>
            </button>
          </div>

          {/* Playhead scrubber */}
          <div className="flex flex-col justify-center ml-3 gap-1 shrink-0 w-24">
            <div className="text-[9px] font-mono text-[#4a5568] uppercase tracking-widest">Scrub</div>
            <input
              type="range"
              min={0}
              max={totalDuration}
              step={0.1}
              value={elapsed}
              onChange={e => {
                const t = +e.target.value;
                setElapsed(t);
                let acc = 0;
                for (let i = 0; i < frames.length; i++) {
                  acc += frames[i].duration;
                  if (t < acc) { setActiveFrame(i); break; }
                }
              }}
              className="w-full"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}
