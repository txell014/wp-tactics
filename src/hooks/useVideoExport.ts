import { useState } from "react";
import { VIEW_DIMS } from "../constants/pool";
import type { AppMode, ExportResolution, PoolView } from "../types";
import { exportPoolVideo, isVideoExportSupported } from "../utils/exportVideo";
import { sanitizeFileName } from "../utils/format";

interface Options {
  view: PoolView;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  activeFrame: number;
  seekToFrame: (index: number) => void;
  seekToTime: (seconds: number) => void;
  totalDuration: number;
  playTitle: string;
  /** S'executa just abans d'exportar (aturar la reproducció, tancar menús...). */
  onBeforeExport: () => void;
}

export function useVideoExport(options: Options) {
  const [exporting, setExporting] = useState(false);

  const exportVideo = async (resolution: ExportResolution) => {
    const { view, appMode, setAppMode, activeFrame, seekToFrame, seekToTime, totalDuration, playTitle, onBeforeExport } = options;

    if (!isVideoExportSupported()) {
      alert("Aquest navegador no permet exportar vídeo.");
      return;
    }

    onBeforeExport();
    setExporting(true);
    try {
      setAppMode("animacio"); // sense això l'exportació no interpola els moviments
      await exportPoolVideo({
        viewW: VIEW_DIMS[view].w,
        viewH: VIEW_DIMS[view].h,
        width: resolution.width,
        height: resolution.height,
        duration: totalDuration,
        fileName: sanitizeFileName(playTitle),
        setTime: seekToTime,
      });
    } catch (err) {
      console.error("Error exportant vídeo:", err);
      alert("Error exportant el vídeo.");
    } finally {
      setAppMode(appMode);
      seekToFrame(activeFrame);
      setExporting(false);
    }
  };

  return { exporting, exportVideo };
}
