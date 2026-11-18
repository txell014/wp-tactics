import { Plus, X } from "lucide-react";
import { TIMELINE_HEIGHT_PX } from "../constants/pool";
import { ui } from "../styles/classNames";
import type { FrameData } from "../types";
import { formatTime } from "../utils/format";
import { FrameThumbnail } from "./FrameThumbnail";

interface Props {
  frames: FrameData[];
  activeFrame: number;
  elapsed: number;
  frameDuration: number;
  swapColors: boolean;
  locked: boolean;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDeleteFrame: (index: number) => void;
  onChangeDuration: (seconds: number) => void;
}

export function Timeline({ frames, activeFrame, elapsed, frameDuration, swapColors, locked, onSelectFrame, onAddFrame, onDeleteFrame, onChangeDuration }: Props) {
  return (
    <footer
      className={`bg-[#0d1b2a] border-t border-[#1e2d42] shrink-0 flex flex-col justify-center ${locked ? ui.locked : ""}`}
      style={{ height: TIMELINE_HEIGHT_PX }}
    >
      <div className="flex items-stretch h-full px-4 py-3 gap-0 overflow-x-auto">
        <div className="flex flex-col justify-center mr-4 shrink-0 min-w-[90px] gap-1">
          <div className="text-[13px] font-display font-bold text-[#8899aa] uppercase tracking-widest">Línia de temps</div>
          <div className="text-sm font-mono text-[#00d4d4]">{formatTime(elapsed)}</div>
          <div className="flex items-center gap-1 bg-[#0a1525] border border-[#1e2d42] px-1.5 py-0.5 rounded w-fit" title="Durada de cada frame">
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={frameDuration}
              onChange={e => onChangeDuration(+e.target.value)}
              className="w-10 bg-transparent text-[#00d4d4] font-mono text-sm outline-none text-right"
            />
            <span className="text-[#00d4d4] font-mono text-[12px]">s/frame</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 overflow-x-auto py-1 px-1">
          {frames.map((f, idx) => (
            <div
              key={f.id}
              onClick={() => onSelectFrame(idx)}
              className={`timeline-frame shrink-0 rounded-lg border-2 cursor-pointer overflow-hidden flex flex-col w-[170px] ${
                idx === activeFrame ? "border-[#00d4d4]" : "border-[#1e2d42]"
              }`}
            >
              <div className="flex-1 bg-[#0b2a4a] relative overflow-hidden">
                <FrameThumbnail frame={f} swapColors={swapColors} />
                {idx === activeFrame && <div className="absolute inset-0 border-2 border-[#00d4d4] rounded pointer-events-none opacity-40" />}
              </div>
              <div className="bg-[#111827] px-2 py-1 flex items-center justify-between gap-1">
                <span className="text-[13px] font-display font-bold text-[#f0f4f8] truncate leading-tight">{f.label}</span>
                {frames.length > 1 && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteFrame(idx);
                    }}
                    className="text-[#4a5568] hover:text-[#e74c3c] w-6 h-6 flex items-center justify-center rounded hover:bg-[#2a1515] transition-colors shrink-0"
                    title="Eliminar frame"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={onAddFrame}
            className="shrink-0 w-24 min-h-[110px] rounded-lg border-2 border-dashed border-[#1e2d42] hover:border-[#00d4d4] hover:bg-[#00d4d408] transition-colors flex flex-col items-center justify-center gap-1 text-[#4a5568] hover:text-[#00d4d4]"
          >
            <Plus size={28} />
            <span className="text-[11px] font-mono uppercase tracking-wider">Nou Frame</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
