import { Pause, Play, Repeat, Square } from "lucide-react";
import { ui } from "../../styles/classNames";
import { formatTime } from "../../utils/format";

interface Props {
  playing: boolean;
  looping: boolean;
  elapsed: number;
  totalDuration: number;
  disabled: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
}

export function PlaybackControls({ playing, looping, elapsed, totalDuration, disabled, onTogglePlay, onStop, onToggleLoop }: Props) {
  return (
    <div className="flex items-center gap-1">
      <button
        className={`${ui.iconButton} ${playing ? ui.iconButtonActive : ui.iconButtonPrimary}`}
        onClick={onTogglePlay}
        disabled={disabled}
        title={playing ? "Pausa" : "Reproduir"}
      >
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>
      <button className={`${ui.iconButton} ${ui.iconButtonIdle}`} onClick={onStop} disabled={disabled} title="Aturar">
        <Square size={16} fill="currentColor" />
      </button>
      <button className={`${ui.iconButton} ${looping ? ui.iconButtonOn : ui.iconButtonIdle}`} onClick={onToggleLoop} title="Bucle">
        <Repeat size={18} />
      </button>
      <div className="font-mono text-sm text-[#00d4d4] bg-[#0d1b2a] px-2.5 py-1.5 rounded border border-[#1e2d42] min-w-[110px] text-center tabular-nums">
        {formatTime(elapsed)} / {formatTime(totalDuration)}
      </div>
    </div>
  );
}
