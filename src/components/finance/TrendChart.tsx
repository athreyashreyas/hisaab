import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatCompactINR, formatINR } from '../../lib/calculations';

export interface TrendPoint {
  label: string; // x-axis tick (e.g. "12 Jul", "Jul")
  spent: number; // paise
}

/** Spend-over-time area chart for Insights (teal fill on parchment). */
export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    // `color` carries the themed accent; the chart's paint uses currentColor so
    // the line, fill, and active dot re-theme (var() isn't reliable in SVG
    // presentation attributes, but currentColor is).
    <div className="h-52 w-full px-1 pt-2 text-teal-500">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#E0DCD2" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9B9890' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            width={44}
            tick={{ fontSize: 11, fill: '#9B9890' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatCompactINR(v)}
          />
          <Tooltip
            cursor={{ stroke: 'currentColor', strokeOpacity: 0.4, strokeWidth: 1 }}
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #E0DCD2',
              background: '#FDFCF9',
              fontSize: 12,
              boxShadow: '0 4px 6px -1px rgba(35,25,15,0.08)',
            }}
            labelStyle={{ color: '#6B6960', fontWeight: 600 }}
            formatter={(v: number) => [formatINR(v), 'Spent']}
          />
          <Area
            type="monotone"
            dataKey="spent"
            stroke="currentColor"
            strokeWidth={2}
            fill="url(#trendFill)"
            dot={false}
            activeDot={{ r: 4, fill: 'currentColor' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
