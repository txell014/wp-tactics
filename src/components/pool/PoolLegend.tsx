import { FONTS, COLORS } from "../../constants/theme";
import { VIEW_DIMS } from "../../constants/pool";
import type { PoolView } from "../../types";
import { getTokenColors } from "../../utils/colors";
import { sideLabel, sideOfClub } from "../../utils/teams";
import type { Club } from "../../utils/teams";

const LEGEND_W = 160;
const LEGEND_H = 55;
const CLUBS: Club[] = ["Local", "Visitant"];

interface Props {
  view: PoolView;
  swapColors: boolean;
}

export function PoolLegend({ view, swapColors }: Props) {
  const half = view === "half";
  const scale = half ? 0.75 : 1;
  const { w: viewW, h: viewH } = VIEW_DIMS[view];
  const x = half ? viewW - LEGEND_W * scale - 15 : (viewW - LEGEND_W) / 2;
  const y = half ? viewH - LEGEND_H * scale - 15 : viewH - 92;

  const rows = [
    ...CLUBS.map(club => {
      const side = sideOfClub(club, swapColors);
      const colors = getTokenColors(side, swapColors);
      return { label: `Equip ${club} (${sideLabel(side, true)})`, color: colors.fill, stroke: colors.stroke };
    })
  ];

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <rect x={0} y={0} width={LEGEND_W} height={LEGEND_H} rx={4} fill="rgba(10,15,30,0.7)" />
      {rows.map(({ label, color, stroke }, i) => (
        <g key={label} transform={`translate(10, ${i * 23 + 15})`}>
          <circle r={6} cx={6} cy={0} fill={color} stroke={stroke} />
          <text x={20} y={4.5} fontSize={12.5} fill="rgba(255,255,255,0.8)" fontFamily={FONTS.label}>
            {label}
          </text>
        </g>
      ))}
    </g>
  );
}
