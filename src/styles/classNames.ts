/** Classes de Tailwind reutilitzades. Les classes `btn-ghost`, `btn-export`, `font-display`,
 *  `motion-path`, `player-token` i `timeline-frame` venen del CSS global existent. */
export const ui = {
  sectionTitle: "text-[15px] font-display font-bold text-[#8899aa] uppercase tracking-widest mb-3",

  panelButton: "w-full flex items-center gap-2 px-2.5 py-2 rounded text-sm font-medium transition-colors",
  panelButtonIdle: "bg-[#111827] border border-[#1e2d42] text-[#8899aa] hover:text-[#f0f4f8]",
  panelButtonBall: "bg-[#2e2608] border border-[#ffd92e40] text-[#ffd92e]",
  panelButtonLegend: "bg-[#1a2e0a] border border-[#b8ff2e40] text-[#b8ff2e]",

  dropdown: "bg-[#1a2235] border border-[#2a3a55] rounded-lg shadow-2xl",
  dropdownHeader: "px-3 py-1.5 text-[12px] font-mono text-[#8899aa] uppercase tracking-wider border-b border-[#2a3a55]",

  iconButton: "flex items-center justify-center w-10 h-10 rounded-lg disabled:opacity-40 transition-colors",
  iconButtonIdle: "bg-[#1a2235] text-[#8899aa] hover:text-[#f0f4f8]",
  iconButtonActive: "bg-[#1a2235] text-[#00d4d4]",
  iconButtonPrimary: "bg-[#1a2235] text-[#f0f4f8] hover:text-[#00d4d4]",
  iconButtonOn: "bg-[#00d4d4] text-[#0a0f1e]",

  locked: "pointer-events-none opacity-60",
} as const;
