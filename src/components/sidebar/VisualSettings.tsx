import { Map as MapIcon, Palette } from "lucide-react";
import { ui } from "../../styles/classNames";

interface Props {
  swapColors: boolean;
  showLegend: boolean;
  onToggleColors: () => void;
  onToggleLegend: () => void;
}

export function VisualSettings({ swapColors, showLegend, onToggleColors, onToggleLegend }: Props) {
  return (
    <div className="p-3">
      <div className={ui.sectionTitle}>Configuració Visual</div>
      <button onClick={onToggleColors} className={`mb-2 justify-between ${ui.panelButton} ${ui.panelButtonIdle}`}>
        <div className="flex items-center gap-2">
          <Palette size={14} /> Colors
        </div>
        <span>{swapColors ? "Defensa" : "Atac"}</span>
      </button>
      <button onClick={onToggleLegend} className={`${ui.panelButton} ${showLegend ? ui.panelButtonLegend : ui.panelButtonIdle}`}>
        <MapIcon size={14} /> Llegenda Piscina
      </button>
    </div>
  );
}
