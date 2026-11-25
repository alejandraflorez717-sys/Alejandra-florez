import React, { useState } from 'react';
import { FrequencyItem } from '../../types/survey';

interface CategoryBarChartProps {
  items: FrequencyItem[];
  total: number;
}

const BAR_COLORS = [
  '#D96B8A',
  '#8B72BE',
  '#C69A7B',
  '#E497AE',
  '#A691D1',
  '#D6B8A2',
];

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({ items, total }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const widthPct = (item.count / maxCount) * 100;
        const barColor = BAR_COLORS[idx % BAR_COLORS.length];
        const isHovered = hovered === item.label;

        return (
          <div
            key={item.label}
            onMouseEnter={() => setHovered(item.label)}
            onMouseLeave={() => setHovered(null)}
            className="group"
          >
            <div className="flex items-baseline justify-between gap-4 mb-1">
              <span className="text-sm font-medium text-[#231A20] truncate">{item.label}</span>
              <span className="text-xs font-mono tabular-nums text-[#5A4C53] shrink-0">
                {item.count} / {total} ({item.percent.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full h-3 bg-[#F5EFEA] rounded-full overflow-hidden border border-[#EADFD9]">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${Math.max(2, widthPct)}%`,
                  backgroundColor: barColor,
                  opacity: hovered && !isHovered ? 0.65 : 1,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
