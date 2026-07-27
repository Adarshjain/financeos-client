'use client';

import { BarChart as BarChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InvestmentSummary, Position } from '@/lib/types';
import { formatMoney } from '@/lib/utils';

interface AllocationChartsProps {
  summary: InvestmentSummary | null;
  positions: Position[];
}

const COLORS = [
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#14B8A6', // Teal
];

export function AllocationCharts({ summary, positions }: AllocationChartsProps) {
  const brokerData = useMemo(() => {
    if (!summary?.byBroker) return [];
    return summary.byBroker.map((b) => ({
      name: b.brokerName || 'Broker',
      value: typeof b.currentValue === 'string' ? parseFloat(b.currentValue) : b.currentValue || 0,
    })).filter((d) => d.value > 0);
  }, [summary]);

  const typeData = useMemo(() => {
    if (!summary?.byInstrumentType) return [];
    return summary.byInstrumentType.map((t) => ({
      name: t.type ? t.type.toUpperCase().replace('_', ' ') : 'Other',
      value: typeof t.currentValue === 'string' ? parseFloat(t.currentValue) : t.currentValue || 0,
    })).filter((d) => d.value > 0);
  }, [summary]);

  const topHoldingsData = useMemo(() => {
    return positions
      .map((p) => ({
        name: p.instrument.symbol || p.instrument.name,
        fullName: p.instrument.name,
        value: typeof p.currentValue === 'string' ? parseFloat(p.currentValue) : p.currentValue || 0,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [positions]);

  const totalPortfolioValue = useMemo(() => {
    return brokerData.reduce((sum, d) => sum + d.value, 0);
  }, [brokerData]);

  if (brokerData.length === 0 && typeData.length === 0 && topHoldingsData.length === 0) {
    return null;
  }

  const renderTooltipContent = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percent = totalPortfolioValue > 0 ? ((data.value / totalPortfolioValue) * 100).toFixed(1) : '0.0';
      return (
        <div className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white p-2 rounded-lg text-xs shadow-lg border border-slate-200 dark:border-slate-800 space-y-0.5">
          <div className="font-bold">{data.name}</div>
          <div className="tabular-nums">{formatMoney(data.value)} ({percent}%)</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full min-w-0">
      {/* Donut Chart: By Asset Class */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm w-full min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <PieChartIcon className="w-3.5 h-3.5 text-emerald-500" />
            Asset Class Allocation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {typeData.length === 0 ? (
            <div className="text-xs text-slate-400 py-8 text-center">No data available</div>
          ) : (
            <div className="h-44 w-full text-slate-500 dark:text-slate-400">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {typeData.map((_, index) => (
                      <Cell key={`cell-type-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={renderTooltipContent} />
                  <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Donut Chart: By Broker */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm w-full min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <PieChartIcon className="w-3.5 h-3.5 text-indigo-500" />
            Broker Account Allocation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {brokerData.length === 0 ? (
            <div className="text-xs text-slate-400 py-8 text-center">No data available</div>
          ) : (
            <div className="h-44 w-full text-slate-500 dark:text-slate-400">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={brokerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {brokerData.map((_, index) => (
                      <Cell key={`cell-broker-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={renderTooltipContent} />
                  <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Horizontal Bar Chart: Top 5 Holdings */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm w-full min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <BarChartIcon className="w-3.5 h-3.5 text-purple-500" />
            Top 5 Holdings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {topHoldingsData.length === 0 ? (
            <div className="text-xs text-slate-400 py-8 text-center">No data available</div>
          ) : (
            <div className="h-44 w-full text-slate-500 dark:text-slate-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topHoldingsData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10, fill: 'currentColor' }} />
                  <Tooltip content={renderTooltipContent} />
                  <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
