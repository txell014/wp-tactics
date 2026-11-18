import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { DRAG_THRESHOLD_PX, HALF_VIEW_MIN_X, POOL_H, POOL_W, TOKEN_RADIUS, TRAIL_LIFETIME_MS, TRAIL_TICK_MS, VIEW_DIMS } from "../constants/pool";
import { PLAYER_BY_ID } from "../constants/players";
import { COLORS } from "../constants/theme";
import type { AppMode, FrameData, LiveTrail, PoolView, Pt } from "../types";
import { getTokenColors } from "../utils/colors";
import { findNearestOpponent } from "../utils/frames";
import { clamp, distance } from "../utils/geometry";
import { useLatest } from "./useLatest";

type DragKind = "player" | "ball";

interface DragState {
  id: string;
  kind: DragKind;
  offset: Pt;
  startX: number;
  startY: number;
  moved: boolean;
  wasSelected: boolean;
  color: string;
}

interface Options {
  view: PoolView;
  frame: FrameData;
  appMode: AppMode;
  swapColors: boolean;
  selectedId: string | null;
  onSelectPlayer: (id: string | null) => void;
  onMovePlayer: (id: string, x: number, y: number) => void;
  onMoveBall: (x: number, y: number) => void;
  onContextMenu: (id: string, other: string | null, x: number, y: number) => void;
  onCloseContext: () => void;
}

/** Arrossegamentf de fitxes i pilota, menú contextual i cues de la pissarra. */
export function usePoolInteraction(options: Options) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [liveTrails, setLiveTrails] = useState<Record<string, LiveTrail>>({});
  const latest = useLatest(options);

  /** Coordenades del punter dins la piscina (tenint en compte la vista girada). */
  const toPoolCoords = useCallback(
    (e: { clientX: number; clientY: number }): Pt => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const { view } = latest.current;
      const { w, h } = VIEW_DIMS[view];
      const vx = (e.clientX - rect.left) * (w / rect.width);
      const vy = (e.clientY - rect.top) * (h / rect.height);
      return view === "half" ? { x: POOL_W - vy, y: vx } : { x: vx, y: vy };
    },
    [latest]
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent, id: string, kind: DragKind) => {
      if (e.button !== 0) return; // només botó principal / tàctil
      e.stopPropagation();
      const { frame, selectedId, swapColors, appMode, onCloseContext, onSelectPlayer } = latest.current;
      onCloseContext();
      onSelectPlayer(kind === "player" ? id : null);

      const pointer = toPoolCoords(e);
      const pos = kind === "ball" ? frame.ball : frame.players[id];
      if (!pos) return;
      const color = kind === "ball" ? COLORS.ball : getTokenColors(PLAYER_BY_ID[id].team, swapColors).fill;

      dragRef.current = {
        id,
        kind,
        offset: { x: pointer.x - pos.x, y: pointer.y - pos.y },
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        wasSelected: selectedId === id,
        color,
      };

      if (appMode === "pissarra") {
        setLiveTrails(prev => ({ ...prev, [id]: { color, points: [{ x: pos.x, y: pos.y, t: Date.now() }] } }));
      }
    },
    [latest, toPoolCoords]
  );

  // Listeners globals: es registren una sola vegada i llegeixen sempre l'últim estat
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !svgRef.current) return;
      const { view, appMode, onMovePlayer, onMoveBall } = latest.current;

      if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_THRESHOLD_PX) {
        drag.moved = true;
      }

      const pointer = toPoolCoords(e);
      const minX = (view === "half" ? HALF_VIEW_MIN_X : 0) + TOKEN_RADIUS;
      const x = clamp(pointer.x - drag.offset.x, minX, POOL_W - TOKEN_RADIUS);
      const y = clamp(pointer.y - drag.offset.y, TOKEN_RADIUS, POOL_H - TOKEN_RADIUS);

      if (drag.kind === "ball") onMoveBall(x, y);
      else onMovePlayer(drag.id, x, y);

      if (drag.moved && appMode === "pissarra") {
        const now = Date.now();
        setLiveTrails(prev => {
          // Si la cua s'ha esvaït durant una pausa, es torna a crear
          const current = prev[drag.id] ?? { color: drag.color, points: [] };
          const last = current.points[current.points.length - 1];
          if (last && distance(last, { x, y }) <= 5) return prev;
          return { ...prev, [drag.id]: { ...current, points: [...current.points, { x, y, t: now }] } };
        });
      }
    };

    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      const { frame, onSelectPlayer, onContextMenu } = latest.current;

      if (drag.kind === "ball") {
        if (!drag.moved) onSelectPlayer(null);
        return;
      }
      if (drag.moved || drag.wasSelected) {
        onSelectPlayer(null);
        return;
      }
      // Clic simple: menú d'accions si hi ha una rival a prop o la jugadora porta la pilota
      const nearest = findNearestOpponent(frame.players, drag.id);
      if (nearest || frame.players[drag.id]?.hasBall) onContextMenu(drag.id, nearest, e.clientX, e.clientY);
    };

    const onCancel = () => {
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [latest, toPoolCoords]);

  // Esvaïment de les cues de la pissarra
  useEffect(() => {
    if (options.appMode !== "pissarra") return;
    const timer = setInterval(() => {
      const now = Date.now();
      setLiveTrails(prev => {
        let changed = false;
        const next: Record<string, LiveTrail> = {};
        for (const [id, trail] of Object.entries(prev)) {
          const points = trail.points.filter(p => now - p.t < TRAIL_LIFETIME_MS);
          if (points.length !== trail.points.length) changed = true;
          if (points.length > 0) next[id] = points.length === trail.points.length ? trail : { ...trail, points };
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, TRAIL_TICK_MS);
    return () => clearInterval(timer);
  }, [options.appMode]);

  return { svgRef, liveTrails, onPointerDown };
}
