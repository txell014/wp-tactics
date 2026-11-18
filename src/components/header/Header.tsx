import { RotateCcw, Route } from "lucide-react";
import { CAMP, MODES } from "../../constants/ui";
import type { AppMode, ExportResolution, PoolView } from "../../types";
import { ExportMenu } from "./ExportMenu";
import { PlaybackControls } from "./PlaybackControls";
import { PlayTitle } from "./PlayTitle";

interface Props {
  playTitle: string;
  onTitleChange: (title: string) => void;
  appMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  poolView: PoolView;
  onViewChange: (mode: PoolView) => void;
  playing: boolean;
  looping: boolean;
  elapsed: number;
  totalDuration: number;
  showPaths: boolean;
  exporting: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
  onReset: () => void;
  onTogglePaths: () => void;
  onExport: (resolution: ExportResolution) => void;
}

export function Header(props: Props) {
  const { appMode, exporting, showPaths, poolView } = props;
  const pathsDisabled = appMode === "pissarra";
  const isAnimation = appMode === "animacio";

  return (
    <header className="flex items-center gap-3 px-4 py-4 bg-[#0d1b2a] border-b border-[#1e2d42] shrink-0" style={{ minHeight: 52 }}>
      {/* Títol de la jugada a l'esquerra */}
      <div className="flex items-center gap-1.5 min-w-0 max-w-xs">
        <PlayTitle value={props.playTitle} onChange={props.onTitleChange} />
      </div>

      <button
        onClick={props.onReset}
        disabled={exporting}
        className="btn-ghost flex items-center gap-1 px-2.5 py-1.5 rounded text-sm font-mono min-h-[40px] text-[#e74c3c] hover:text-[#ff6b6b] hover:bg-[#2a1515]"
      >
        <RotateCcw size={14} />
        <span className="hidden md:inline">Reiniciar</span>
      </button>

      {/* Espaiador per empènyer els controls de reproducció al centre (si estem en animació) */}
      <div className="flex-1" />

      {/* CONTROLS DE REPRODUCCIÓ: Només es mostren en mode animació i queden centrats */}
      {isAnimation && (
        <>
          <div className="w-px h-6 bg-[#1e2d42]" />
          <PlaybackControls
            playing={props.playing}
            looping={props.looping}
            elapsed={props.elapsed}
            totalDuration={props.totalDuration}
            disabled={exporting}
            onTogglePlay={props.onTogglePlay}
            onStop={props.onStop}
            onToggleLoop={props.onToggleLoop}
          />
          <div className="w-px h-6 bg-[#1e2d42]" />
        </>
      )}

      {/* Espaiador dret per equilibrar */}
      <div className="flex-1" />

      {/* Selecció de vista de camp (Complet / Mig camp) */}
      <div className="flex items-center rounded-lg border border-[#1e2d42] overflow-hidden mr-3">
        {CAMP.map(({ mode, label }) => (
          <button
            key={mode}
            disabled={exporting}
            onClick={() => props.onViewChange(mode)}
            className={`px-3 py-1.5 text-sm min-h-[40px] transition-colors disabled:opacity-50 ${
              poolView === mode ? "bg-[#00d4d4] text-[#0a0f1e] font-semibold" : "bg-[#1a2235] text-[#8899aa] hover:text-[#f0f4f8]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Selecció de mode (Pissarra / Animació) */}
      <div className="flex items-center rounded-lg border border-[#1e2d42] overflow-hidden mr-3">
        {MODES.map(({ mode, label }) => (
          <button
            key={mode}
            disabled={exporting}
            onClick={() => props.onModeChange(mode)}
            className={`px-3 py-1.5 text-sm min-h-[40px] transition-colors disabled:opacity-50 ${
              appMode === mode ? "bg-[#00d4d4] text-[#0a0f1e] font-semibold" : "bg-[#1a2235] text-[#8899aa] hover:text-[#f0f4f8]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Botó de trajectòries */}
      <button
        onClick={props.onTogglePaths}
        disabled={pathsDisabled}
        title={pathsDisabled ? "Les trajectòries només es mostren en mode animació" : "Mostrar trajectòries"}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm transition-colors min-h-[40px] mr-2 disabled:opacity-40 ${
          showPaths ? "bg-[#1a2235] text-[#00d4d4] border border-[#00d4d420]" : "btn-ghost"
        }`}
      >
        <Route size={16} />
        <span className="hidden lg:inline">Trajectòries</span>
      </button>

      {/* Menú d'exportació */}
      <ExportMenu exporting={exporting} onExport={props.onExport} />
    </header>
  );
}
