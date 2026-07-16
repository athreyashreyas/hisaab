import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Money } from '../ui/Money';
import { formatINR } from '../../lib/calculations';
import type { CategorySlice } from '../../lib/calculations';
import type { Category, ID } from '../../types';

/**
 * "Where it went": a recharts donut with a total in the hole and a ranked legend.
 * Slice colours come from each category's own colour (mockup .donut/.legend).
 */
export function CategoryPie({
  slices,
  categoryMap,
  total,
}: {
  slices: CategorySlice[];
  categoryMap: Map<ID, Category>;
  total: number;
}) {
  const data = slices.map((s) => {
    const cat = s.categoryId ? categoryMap.get(s.categoryId) : undefined;
    return {
      name: cat?.name ?? 'Uncategorised',
      value: s.total,
      color: cat?.color ?? '#6B6960',
    };
  });

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="relative h-28 w-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={38}
              outerRadius={56}
              paddingAngle={data.length > 1 ? 1.5 : 0}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-[10px] uppercase tracking-[0.08em] text-ink-300">Spent</span>
          <Money paise={total} className="text-[17px] text-ink-900" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {data.slice(0, 6).map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-[12.5px] text-ink-700">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: d.color }} />
            <span className="truncate">{d.name}</span>
            <span className="ml-auto shrink-0 font-semibold tabular-nums text-ink-900">
              {formatINR(d.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
