'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Edit2, Loader2, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { PriceHistoryPoint } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

export interface PriceHistoryPanelProps {
  instrument: {
    id: string;
    name: string;
    symbol?: string;
    lastPrice?: string | number;
  };
}

export function PriceHistoryPanel({ instrument }: PriceHistoryPanelProps) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: keys.investments.priceHistory(instrument.id),
    queryFn: async () =>
      (
        await api.GET('/api/v1/instruments/{id}/prices', {
          params: { path: { id: instrument.id } },
        })
      ).data! as PriceHistoryPoint[],
  });
  const points = useMemo(() => data ?? [], [data]);

  // Edit / Delete State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriceInput, setEditPriceInput] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: (vars: { priceId: string; price: number }) =>
      api.PUT('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
        params: {
          path: { instrumentId: instrument.id, priceId: vars.priceId },
        },
        body: { price: vars.price },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const isUpdating = updateMutation.isPending;

  const deleteMutation = useMutation({
    mutationFn: (priceId: string) =>
      api.DELETE('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
        params: { path: { instrumentId: instrument.id, priceId } },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });

  const sortedPoints = useMemo(() => {
    return [...points].sort((a, b) => new Date(b.asOf).getTime() - new Date(a.asOf).getTime());
  }, [points]);

  const chartData = useMemo(() => {
    return [...points]
      .sort((a, b) => new Date(a.asOf).getTime() - new Date(b.asOf).getTime())
      .map((pt) => ({
        date: formatDate(pt.asOf),
        price: typeof pt.close === 'string' ? parseFloat(pt.close) : Number(pt.close) || 0,
        source: pt.source || 'Auto',
      }));
  }, [points]);

  const handleStartEdit = (pt: PriceHistoryPoint) => {
    if (!pt.id) return;
    setEditingId(pt.id);
    setEditPriceInput(String(pt.close));
  };

  const handleSaveEdit = async (priceId: string) => {
    if (!editPriceInput || isNaN(parseFloat(editPriceInput))) {
      toast.error('Please enter a valid price');
      return;
    }
    try {
      await updateMutation.mutateAsync({
        priceId,
        price: parseFloat(editPriceInput),
      });
      toast.success('Price updated successfully');
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.response.message : 'Failed to update price');
    }
  };

  const handleDelete = async (priceId: string) => {
    setDeletingId(priceId);
    try {
      await deleteMutation.mutateAsync(priceId);
      toast.success('Price entry deleted');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.response.message : 'Failed to delete price');
    } finally {
      setDeletingId(null);
    }
  };

  const getSourceBadge = (source?: string) => {
    if (!source) return null;
    const upper = source.toUpperCase();
    switch (upper) {
      case 'AMFI':
        return (
          <Badge className="text-2xs px-1.5 py-0 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold border-0" title="Auto-fetched price — refreshes from AMFI">
            AMFI
          </Badge>
        );
      case 'YAHOO':
        return (
          <Badge className="text-2xs px-1.5 py-0 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold border-0" title="Auto-fetched price — refreshes from Yahoo Finance">
            YAHOO
          </Badge>
        );
      case 'MANUAL':
        return <Badge className="text-2xs px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold border-0">MANUAL</Badge>;
      default:
        return (
          <Badge variant="secondary" className="text-2xs px-1.5 py-0 font-bold border-0">
            {source}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-2 py-2">
      {isLoading ? (
        <div className="text-xs text-slate-400 py-12 text-center">Loading price history...</div>
      ) : chartData.length === 0 ? (
        <div className="text-xs text-slate-400 py-12 text-center italic">No historical price points recorded yet for this instrument.</div>
      ) : (
        <>
          {/* Chart */}
          <div className="h-48 w-full pt-2 text-slate-500 dark:text-slate-400">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'currentColor' }} />
                <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} domain={['auto', 'auto']} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white p-2 rounded text-xs shadow border border-slate-200 dark:border-slate-800">
                          <div>{data.date}</div>
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(data.price)}</div>
                          <div className="text-2xs text-slate-400">Source: {data.source}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#priceGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Price Points History List */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Price History Log ({sortedPoints.length})</span>
              <span className="text-2xs text-slate-400 font-normal">Newest first</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
              {sortedPoints.map((pt) => {
                const isManual = pt.source?.toUpperCase() === 'MANUAL';
                const isEditingThis = editingId === pt.id;
                const isDeletingThis = deletingId === pt.id;

                return (
                  <div key={pt.id || `${pt.asOf}-${pt.source}-${pt.close}`} className="p-2.5 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {getSourceBadge(pt.source)}
                      <span className="text-slate-500 dark:text-slate-400 tabular-nums">{formatDate(pt.asOf)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditingThis ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="any"
                            value={editPriceInput}
                            onChange={(e) => setEditPriceInput(e.target.value)}
                            className="h-6 w-24 text-xs font-bold px-1.5 py-0 tabular-nums bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                            autoFocus
                          />
                          <Button
                            size="icon-xs"
                            onClick={() => pt.id && handleSaveEdit(pt.id)}
                            disabled={isUpdating}
                            className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          >
                            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </Button>
                          <Button size="icon-xs" onClick={() => setEditingId(null)} disabled={isUpdating} className="text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatMoney(pt.close)}</span>
                      )}

                      {isManual && pt.id && !isEditingThis && (
                        <div className="flex items-center gap-0.5 border-l border-slate-200 dark:border-slate-800 pl-1.5 ml-1">
                          <Button size="icon-xs" title="Edit manual price" onClick={() => handleStartEdit(pt)} className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                            <Edit2 className="w-3 h-3" />
                          </Button>

                          <Button
                            size="icon-xs"
                            title="Delete manual price"
                            onClick={() => pt.id && handleDelete(pt.id)}
                            disabled={isDeletingThis}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                          >
                            {isDeletingThis ? <Loader2 className="w-3 h-3 animate-spin text-rose-500" /> : <Trash2 className="w-3 h-3" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
