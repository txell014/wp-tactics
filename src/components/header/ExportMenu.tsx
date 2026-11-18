import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { EXPORT_RESOLUTIONS } from "../../constants/pool";
import { ui } from "../../styles/classNames";
import type { ExportResolution } from "../../types";

interface Props {
  exporting: boolean;
  onExport: (resolution: ExportResolution) => void;
}

export function ExportMenu({ exporting, onExport }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Es tanca en clicar fora o amb Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        disabled={exporting}
        onClick={() => setOpen(o => !o)}
        className="btn-export flex items-center gap-2 px-4 py-2 rounded-lg text-base min-h-[40px] font-display tracking-wide disabled:opacity-50 disabled:cursor-wait"
      >
        <Download size={18} />
        {exporting ? "Exportant…" : "Exportar MP4"}
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-1 z-50 min-w-[140px] ${ui.dropdown}`}>
          <div className={ui.dropdownHeader}>Resolució</div>
          {EXPORT_RESOLUTIONS.map(res => (
            <button
              key={res.label}
              className="w-full text-left px-3 py-2.5 text-base text-[#f0f4f8] hover:bg-[#243050] transition-colors flex items-center justify-between"
              onClick={() => {
                setOpen(false);
                onExport(res);
              }}
            >
              <span>{res.label}</span>
              <span className="text-[#8899aa] text-sm font-mono">
                {res.width}×{res.height}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
