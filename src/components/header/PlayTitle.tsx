import { useState } from "react";
import { Pencil } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/** Títol de la jugada editable amb un clic. */
export function PlayTitle({ value, onChange }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        autoFocus
        className="bg-[#1a2235] border border-[#00d4d4] rounded px-2 py-1 text-lg text-[#f0f4f8] font-display font-semibold tracking-wide outline-none w-full max-w-sm"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={e => e.key === "Enter" && setEditing(false)}
      />
    );
  }

  return (
    <button className="flex items-center gap-1.5 group max-w-sm" onClick={() => setEditing(true)}>
      <span className="font-display font-semibold text-lg text-[#f0f4f8] tracking-wide truncate">{value}</span>
      <Pencil size={12} className="text-[#4a5568] group-hover:text-[#8899aa]" />
    </button>
  );
}
