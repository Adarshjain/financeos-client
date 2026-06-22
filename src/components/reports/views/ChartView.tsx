'use client';

// Presentational chart renderer over Recharts. Maps the charting-friendly
// ChartData (categories[] + series[{name,data[]}] aligned by index) onto the
// right chart for `chartType`. Pure — no fetching. Reusable by the dashboard.

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { ChartData } from '@/lib/reports.types';

const COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

type ChartRow = Record<string, string | number | null>;

// `fill` makes the chart fill its parent's height (for fixed-height containers
// like dashboard widgets) instead of the default fixed height used in flow
// layouts such as the report builder's preview pane.
export function ChartView({ data, fill }: { data: ChartData; fill?: boolean }) {
  const { chartType, categories, series } = data;

  if (categories.length === 0 || series.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        No data for this configuration.
      </p>
    );
  }

  // Pie / donut: single dimension of slices from the first series.
  if (chartType === 'pie' || chartType === 'donut') {
    const first = series[0];
    const pieData = categories.map((c, i) => ({
      name: c,
      value: first.data[i] ?? 0,
    }));
    return (
      <ChartFrame fill={fill}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius="80%"
            innerRadius={chartType === 'donut' ? '55%' : 0}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ChartFrame>
    );
  }

  const rows: ChartRow[] = categories.map((c, i) => {
    const row: ChartRow = { category: c };
    series.forEach((s) => {
      row[s.name] = s.data[i] ?? null;
    });
    return row;
  });

  const axes = (
    <>
      <CartesianGrid
        strokeDasharray="3 3"
        className="stroke-slate-200 dark:stroke-slate-800"
      />
      <XAxis dataKey="category" tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} width={56} />
      <Tooltip />
      <Legend />
    </>
  );

  if (chartType === 'line') {
    return (
      <ChartFrame fill={fill}>
        <LineChart data={rows}>
          {axes}
          {series.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ChartFrame>
    );
  }

  if (chartType === 'area') {
    return (
      <ChartFrame fill={fill}>
        <AreaChart data={rows}>
          {axes}
          {series.map((s, i) => (
            <Area
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.2}
              connectNulls
            />
          ))}
        </AreaChart>
      </ChartFrame>
    );
  }

  // bar + stackedBar
  const stackId = chartType === 'stackedBar' ? 'stack' : undefined;
  return (
    <ChartFrame fill={fill}>
      <BarChart data={rows}>
        {axes}
        {series.map((s, i) => (
          <Bar
            key={s.name}
            dataKey={s.name}
            stackId={stackId}
            fill={COLORS[i % COLORS.length]}
            radius={stackId ? undefined : [2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}

function ChartFrame({
  children,
  fill,
}: {
  children: React.ReactElement;
  fill?: boolean;
}) {
  return (
    <div className={fill ? 'h-full min-h-0 w-full' : 'h-72 w-full'}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
