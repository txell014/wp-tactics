import { useCallback, useState } from "react";
import type { ActionType, FrameData, TacticalAction } from "../types";
import { autoAssignBall, ballNear, createInitialFrames, makeFrame, uid } from "../utils/frames";

/** Estat dels fotogrames i totes les operacions d'edició sobre el frame actiu. */
export function useFrames() {
  const [frames, setFrames] = useState<FrameData[]>(createInitialFrames);
  const [activeFrame, setActiveFrame] = useState(0);
  const frame = frames[activeFrame];

  const updateActive = useCallback(
    (fn: (f: FrameData) => FrameData) => setFrames(prev => prev.map((f, i) => (i === activeFrame ? fn(f) : f))),
    [activeFrame]
  );

  const movePlayer = useCallback(
    (id: string, x: number, y: number) =>
      updateActive(f => {
        const player = f.players[id];
        if (!player) return f;
        return {
          ...f,
          players: { ...f.players, [id]: { ...player, x, y } },
          // La pilota acompanya la jugadora que la porta
          ball: player.hasBall ? ballNear({ x, y }) : f.ball,
        };
      }),
    [updateActive]
  );

  const moveBall = useCallback(
    (x: number, y: number) =>
      updateActive(f => ({ ...f, ball: { x, y }, players: autoAssignBall(f.players, { x, y }) })),
    [updateActive]
  );

  const toggleVisibility = useCallback(
    (id: string) =>
      updateActive(f => {
        const player = f.players[id];
        if (!player) return f;
        const players = { ...f.players, [id]: { ...player, isHidden: !player.isHidden } };
        // Si s'oculta la jugadora amb la pilota, aquesta passa a una altra atacant
        return player.hasBall && !player.isHidden ? { ...f, players: autoAssignBall(players, f.ball) } : { ...f, players };
      }),
    [updateActive]
  );

  /** Dóna la pilota a la jugadora o, si ja la tenia, la deixa lliure. */
  const toggleBallPossession = useCallback(
    (id: string) =>
      updateActive(f => {
        const player = f.players[id];
        if (!player || player.isHidden) return f;
        const giveBall = !player.hasBall;
        const players = Object.fromEntries(
          Object.entries(f.players).map(([pid, p]) => [pid, { ...p, hasBall: giveBall && pid === id }])
        );
        return { ...f, players, ball: giveBall ? ballNear(player) : f.ball };
      }),
    [updateActive]
  );

  const toggleAction = useCallback(
    (type: ActionType, attackerId: string, defenderId: string) =>
      updateActive(f => {
        const same = (a: TacticalAction) => a.type === type && a.attackerId === attackerId && a.defenderId === defenderId;
        return {
          ...f,
          actions: f.actions.some(same) ? f.actions.filter(a => !same(a)) : [...f.actions, { type, attackerId, defenderId }],
        };
      }),
    [updateActive]
  );

  /** Afegeix un frame al final (copiant l'últim) i en retorna l'índex. */
  const addFrame = useCallback(() => {
    setFrames(prev => [...prev, makeFrame(uid(), `Fotograma ${prev.length + 1}`, prev[prev.length - 1])]);
    return frames.length;
  }, [frames.length]);

  /** Elimina un frame i retorna l'índex que ha de quedar actiu (o null si no es pot eliminar). */
  const deleteFrame = useCallback(
    (idx: number): number | null => {
      if (frames.length <= 1) return null;
      setFrames(prev => prev.filter((_, i) => i !== idx));
      return Math.max(0, activeFrame >= idx ? activeFrame - 1 : activeFrame);
    },
    [frames.length, activeFrame]
  );

  const resetFrames = useCallback(() => {
    setFrames(createInitialFrames());
    setActiveFrame(0);
  }, []);

  return {
    frames,
    frame,
    activeFrame,
    setActiveFrame,
    movePlayer,
    moveBall,
    toggleVisibility,
    toggleBallPossession,
    toggleAction,
    addFrame,
    deleteFrame,
    resetFrames,
  };
}
