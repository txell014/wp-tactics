import { PLAYER_BY_ID } from "../../constants/players";
import { ui } from "../../styles/classNames";
import type { FrameData } from "../../types";
import { Bench } from "./Bench";
import { Inspector } from "./Inspector";
import { VisualSettings } from "./VisualSettings";

interface Props {
  frame: FrameData;
  selectedId: string | null;
  swapColors: boolean;
  showLegend: boolean;
  locked: boolean;
  onSelect: (id: string | null) => void;
  onToggleBall: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleColors: () => void;
  onToggleLegend: () => void;
}

export function Sidebar({ frame, selectedId, swapColors, showLegend, locked, onSelect, onToggleBall, onToggleVisibility, onToggleColors, onToggleLegend }: Props) {
  if (!frame || !frame.players) {
    return null;
  }

  const player = selectedId ? PLAYER_BY_ID[selectedId] ?? null : null;
  const pos = selectedId ? frame.players[selectedId] ?? null : null;
  const excluded = !!selectedId && frame.actions.some(a => a.type === "exclusion" && a.defenderId === selectedId);

  return (
    <aside className={`w-[270px] shrink-0 bg-[#0d1b2a] border-l border-[#1e2d42] flex flex-col overflow-y-auto ${locked ? ui.locked : ""}`}>
      <Inspector
        player={player}
        pos={pos}
        excluded={excluded}
        swapColors={swapColors}
        onToggleBall={() => selectedId && onToggleBall(selectedId)}
        onToggleVisibility={() => selectedId && onToggleVisibility(selectedId)}
      />
      <Bench players={frame.players} selectedId={selectedId} swapColors={swapColors} onSelect={onSelect} />
      <VisualSettings swapColors={swapColors} showLegend={showLegend} onToggleColors={onToggleColors} onToggleLegend={onToggleLegend} />
    </aside>
  );
}
