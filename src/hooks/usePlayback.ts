import { useCallback, useEffect, useState } from "react";
import { DEFAULT_FRAME_DURATION, MAX_TICK_SECONDS, MIN_FRAME_DURATION } from "../constants/pool";

interface Options {
  frameCount: number;
  activeFrame: number;
  setActiveFrame: (index: number) => void;
}

/** Rellotge de l'animació: temps transcorregut, reproducció, bucle i durada de cada frame. */
export function usePlayback({ frameCount, activeFrame, setActiveFrame }: Options) {
  const [frameDuration, setFrameDuration] = useState(DEFAULT_FRAME_DURATION);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [looping, setLooping] = useState(false);
  const totalDuration = frameCount * frameDuration;

  // Avanç del temps amb requestAnimationFrame (animació fluida a la velocitat del monitor)
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, MAX_TICK_SECONDS); // evita salts si la pestanya queda en segon pla
      last = now;
      setElapsed(prev => Math.min(prev + dt, totalDuration));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, totalDuration]);

  // El frame actiu es deriva del temps; al final es reinicia (bucle) o s'atura
  useEffect(() => {
    if (!playing) return;
    if (elapsed >= totalDuration) {
      if (looping) {
        setElapsed(0);
        setActiveFrame(0);
        return;
      }
      setPlaying(false);
    }
    setActiveFrame(Math.min(frameCount - 1, Math.floor(elapsed / frameDuration)));
  }, [elapsed, playing, looping, totalDuration, frameDuration, frameCount, setActiveFrame]);

  const seekToFrame = useCallback(
    (index: number) => {
      setPlaying(false);
      setActiveFrame(index);
      setElapsed(index * frameDuration);
    },
    [frameDuration, setActiveFrame]
  );

  const seekToTime = useCallback(
    (seconds: number) => {
      setElapsed(seconds);
      setActiveFrame(Math.min(frameCount - 1, Math.floor(seconds / frameDuration)));
    },
    [frameCount, frameDuration, setActiveFrame]
  );

  const changeFrameDuration = useCallback(
    (value: number) => {
      const d = Math.max(MIN_FRAME_DURATION, value || MIN_FRAME_DURATION);
      setFrameDuration(d);
      setElapsed(activeFrame * d);
    },
    [activeFrame]
  );

  const togglePlay = useCallback(() => {
    if (!playing && elapsed >= totalDuration) {
      setElapsed(0);
      setActiveFrame(0);
    }
    setPlaying(p => !p);
  }, [playing, elapsed, totalDuration, setActiveFrame]);

  const stop = useCallback(() => {
    setPlaying(false);
    setElapsed(0);
    setActiveFrame(0);
  }, [setActiveFrame]);

  const pause = useCallback(() => setPlaying(false), []);
  const toggleLooping = useCallback(() => setLooping(l => !l), []);

  return {
    frameDuration,
    elapsed,
    playing,
    looping,
    totalDuration,
    changeFrameDuration,
    seekToFrame,
    seekToTime,
    togglePlay,
    toggleLooping,
    stop,
    pause,
  };
}
