/** Colors usats dins els SVG (a les classes de Tailwind es mantenen els valors literals). */
export const COLORS = {
  accent: "#00d4d4",
  danger: "#e74c3c",
  warning: "#f0c040",
  surface: "#111827",
  background: "#0a0f1e",
  ball: "#ffd92e",
  ballStroke: "#c99a00",
  ballGlow: "rgba(255,217,46,0.2)",
  lightKeeper: { fill: "#e74c3c", stroke: "#ffffff", text: "#ffffff" },
  darkKeeper: { fill: "#e74c3c", stroke: "#1a3a6b", text: "#ffffff" },
  teamLight: { fill: "#ffffff", stroke: "#cccccc", text: "#1a3a6b" },
  teamDark: { fill: "#1a3a6b", stroke: "#0a1525", text: "#ffffff" },
  poolWater: ["#07699b", "#0077b6", "#0b6694"],
  thumbnailWater: "#0b2a4a",
  videoBackground: "#080e1c",
} as const;

export const FONTS = {
  token: "Barlow Condensed,sans-serif",
  label: "Inter,sans-serif",
  mono: "JetBrains Mono",
} as const;
