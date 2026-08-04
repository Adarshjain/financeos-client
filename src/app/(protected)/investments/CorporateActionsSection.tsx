'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Edit, Layers, Plus, Search, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { deleteCorporateAction } from '@/actions/investments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CorporateAction, CorporateActionType, Instrument } from '@/lib/types';
import { formatDate } from '@/lib/utils';

import { CorporateActionsDialog } from './CorporateActionsDialog';

interface CorporateActionsSectionProps {
  corporateActions: CorporateAction[];
  instruments: Instrument[];
}

type SortOrder = 'none' | 'asc' | 'desc';

export function CorporateActionsSection({ corporateActions, instruments }: CorporateActionsSectionProps) {
  const router = useRouter();
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dialog state for adding/editing via global section
  const [activeDialogInstrument, setActiveDialogInstrument] = useState<Instrument | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const handleSearchChange = (val: string) => {
    setSearch(val);
  };

  const getActionBadge = (type: CorporateActionType) => {
    let colorClass = 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    let label = type.toUpperCase();

    if (type === 'split') {
      colorClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      label = 'SPLIT';
    } else if (type === 'bonus') {
      colorClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      label = 'BONUS';
    } else if (type === 'demerger') {
      colorClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      label = 'DEMERGER';
    } else if (type === 'merger') {
      colorClass = 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border-pink-200 dark:border-pink-800';
      label = 'MERGER';
    }

    return (
      <Badge variant="outline" className={`font-bold text-[10px] uppercase px-2 py-0.5 ${colorClass}`}>
        {label}
      </Badge>
    );
  };

  const handleDelete = async (instrumentId: string, actionId: string) => {
    if (!confirm('Are you sure you want to delete this corporate action?')) return;
    setDeletingId(actionId);
    try {
      const res = await deleteCorporateAction(instrumentId, actionId);
      if (res.success) {
        toast.success('Corporate action deleted successfully');
        router.refresh();
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to delete corporate action: ' + (err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSort = () => {
    setSortOrder((prev) => {
      if (prev === 'none') return 'asc';
      if (prev === 'asc') return 'desc';
      return 'none';
    });
  };

  // Build a lookup map of instruments for fast name/symbol fallback if needed
  const instrumentMap = useMemo(() => {
    const map = new Map<string, Instrument>();
    instruments.forEach((inst) => map.set(inst.id, inst));
    return map;
  }, [instruments]);

  const filteredActions = useMemo(() => {
    return corporateActions.filter((act) => {
      const inst = instrumentMap.get(act.instrumentId);
      const name = act.instrumentName || inst?.name || '';
      const symbol = act.instrumentSymbol || inst?.symbol || '';
      const notes = act.notes || '';
      const targetName = act.targetInstrumentName || '';
      const targetSymbol = act.targetInstrumentSymbol || '';

      const matchesSearch =
        !search.trim() ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        symbol.toLowerCase().includes(search.toLowerCase()) ||
        notes.toLowerCase().includes(search.toLowerCase()) ||
        targetName.toLowerCase().includes(search.toLowerCase()) ||
        targetSymbol.toLowerCase().includes(search.toLowerCase());

      const matchesType = typeFilter === 'all' || act.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [corporateActions, search, typeFilter, instrumentMap]);

  const sortedActions = useMemo(() => {
    if (sortOrder === 'none') return filteredActions;

    return [...filteredActions].sort((a, b) => {
      const dateA = new Date(a.exDate).getTime();
      const dateB = new Date(b.exDate).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [filteredActions, sortOrder]);

  const openEditDialog = (act: CorporateAction) => {
    const inst = instrumentMap.get(act.instrumentId) || {
      id: act.instrumentId,
      name: act.instrumentName || 'Instrument',
      symbol: act.instrumentSymbol,
      type: 'stock',
      currency: 'INR',
    };
    setActiveDialogInstrument(inst);
    setDialogOpen(true);
  };

  return (
    <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="py-2.5 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          Corporate Actions ({corporateActions.length})
        </CardTitle>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search actions..."
              className="h-8 w-[160px] sm:w-[190px] pl-8 pr-7 text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => handleSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs w-[120px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="split">Split</SelectItem>
              <SelectItem value="bonus">Bonus</SelectItem>
              <SelectItem value="demerger">Demerger</SelectItem>
              <SelectItem value="merger">Merger</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Button */}
          <Button
            variant={sortOrder === 'none' ? 'outline' : 'secondary'}
            size="sm"
            onClick={toggleSort}
            className="h-8 text-xs font-semibold flex items-center rounded-lg border-slate-200 dark:border-slate-800"
            title="Sort by Ex-Date"
          >
            {sortOrder === 'asc' && (
              <>
                <ArrowUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 mr-1" />
                <span>Ex-Date</span>
              </>
            )}
            {sortOrder === 'desc' && (
              <>
                <ArrowDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 mr-1" />
                <span>Ex-Date</span>
              </>
            )}
            {sortOrder === 'none' && (
              <>
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
                <span>Sort</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {corporateActions.length === 0 ? (
          <div className="text-center py-8 px-4 space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No corporate actions recorded yet
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Record stock splits, bonus share issues, demergers, and mergers to automatically adjust holding positions and cost bases.
            </p>
          </div>
        ) : sortedActions.length === 0 ? (
          <div className="text-center py-8 px-4 text-xs text-slate-500">
            No corporate actions match your filters.
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {sortedActions.map((act) => {
                const inst = instrumentMap.get(act.instrumentId);
                const instName = act.instrumentName || inst?.name || 'Instrument';
                const instSymbol = act.instrumentSymbol || inst?.symbol;

                return (
                  <div key={act.id} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {getActionBadge(act.type)}
                        <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                          Ratio: {act.ratioFrom} → {act.ratioTo}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(act)}
                          className="h-6 w-6 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(act.instrumentId, act.id)}
                          disabled={deletingId === act.id}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        {instName} {instSymbol ? `(${instSymbol})` : ''}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Ex-Date: <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{formatDate(act.exDate)}</span>
                      </div>
                    </div>

                    {(act.type === 'demerger' || act.type === 'merger') && (
                      <div className="p-2 rounded bg-purple-50/50 dark:bg-purple-950/20 text-[11px] font-medium text-purple-700 dark:text-purple-300">
                        {act.type === 'demerger' ? (
                          <>
                            Child: <span className="font-bold">{act.targetInstrumentName || 'Child Instrument'}</span> {act.targetInstrumentSymbol ? `(${act.targetInstrumentSymbol})` : ''} • Cost Alloc: {act.costAllocationPct}%
                          </>
                        ) : (
                          <>
                            Merged into: <span className="font-bold">{act.targetInstrumentName || 'Acquirer Instrument'}</span> {act.targetInstrumentSymbol ? `(${act.targetInstrumentSymbol})` : ''}
                          </>
                        )}
                      </div>
                    )}

                    {act.notes && (
                      <p className="text-[10px] text-slate-500 italic">
                        {act.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Instrument</TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Action Type</TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Ratio</TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Ex-Date</TableHead>
                    <TableHead className="text-xs font-semibold whitespace-nowrap">Target / Details</TableHead>
                    <TableHead className="text-right text-xs font-semibold whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedActions.map((act) => {
                    const inst = instrumentMap.get(act.instrumentId);
                    const instName = act.instrumentName || inst?.name || 'Instrument';
                    const instSymbol = act.instrumentSymbol || inst?.symbol;

                    return (
                      <TableRow key={act.id} className="border-slate-100 dark:border-slate-800/60">
                        <TableCell className="py-2.5">
                          <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            {instName}
                          </div>
                          {instSymbol && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {instSymbol}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 whitespace-nowrap">
                          {getActionBadge(act.type)}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 font-mono whitespace-nowrap">
                          {act.ratioFrom} : {act.ratioTo}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap tabular-nums">
                          {formatDate(act.exDate)}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-slate-600 dark:text-slate-400">
                          {act.type === 'demerger' && (
                            <span className="font-medium text-purple-700 dark:text-purple-300">
                              Child: {act.targetInstrumentName || 'Child'} {act.targetInstrumentSymbol ? `(${act.targetInstrumentSymbol})` : ''} • Alloc: {act.costAllocationPct}%
                            </span>
                          )}
                          {act.type === 'merger' && (
                            <span className="font-medium text-purple-700 dark:text-purple-300">
                              Merged into: {act.targetInstrumentName || 'Acquirer'} {act.targetInstrumentSymbol ? `(${act.targetInstrumentSymbol})` : ''}
                            </span>
                          )}
                          {act.notes && (
                            <div className="text-[11px] text-slate-500 italic mt-0.5">
                              {act.notes}
                            </div>
                          )}
                          {act.type !== 'demerger' && act.type !== 'merger' && !act.notes && '—'}
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(act)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                              title="Edit Corporate Action"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(act.instrumentId, act.id)}
                              disabled={deletingId === act.id}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Delete Corporate Action"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>

      {activeDialogInstrument && (
        <CorporateActionsDialog
          instrument={activeDialogInstrument}
          open={dialogOpen}
          onOpenChange={(val) => {
            setDialogOpen(val);
            if (!val) setActiveDialogInstrument(null);
          }}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </Card>
  );
}
