'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Edit, Layers, Plus, Search, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { deleteCorporateAction } from '@/actions/investments';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CorporateAction, CorporateActionType, Instrument } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

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

  // Dialog state for adding/editing corporate actions
  const [activeDialogInstrument, setActiveDialogInstrument] = useState<Instrument | null>(null);
  const [activeEditAction, setActiveEditAction] = useState<CorporateAction | null>(null);
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

  const openCreateDialog = () => {
    setActiveDialogInstrument(null);
    setActiveEditAction(null);
    setDialogOpen(true);
  };

  const openEditDialog = (act: CorporateAction) => {
    const inst = instrumentMap.get(act.instrumentId) || {
      id: act.instrumentId,
      name: act.instrumentName || 'Instrument',
      symbol: act.instrumentSymbol,
      type: 'stock',
      currency: 'INR',
    };
    setActiveDialogInstrument(inst);
    setActiveEditAction(act);
    setDialogOpen(true);
  };

  const renderActionBar = (isMobile = false) => (
    <div className={cn('flex items-center gap-2 w-full', isMobile ? 'flex-col sm:flex-row text-xs' : 'flex-wrap')}>
      {/* Search Input */}
      <div className="relative flex-1 min-w-[180px] w-full">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search actions..."
          className="h-8 pl-8 pr-7 text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg w-full"
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

      {/* Filter & Action Controls */}
      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
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

        {/* Record Action Button */}
        <Button
          size="sm"
          onClick={openCreateDialog}
          className="h-8 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg gap-1 px-3 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Action</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-2 pb-32">
      {/* Desktop Action Bar Container */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        {renderActionBar(false)}
      </Card>

      {/* Mobile PageActionBar Integration */}
      <PageActionBar hideOnScroll>
        {renderActionBar(true)}
      </PageActionBar>

      {/* Main Corporate Action Cards Display */}
      {corporateActions.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No corporate actions recorded yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Record stock splits, bonus share issues, demergers, and mergers to automatically adjust holding positions and cost bases.
            </p>
          </div>
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="h-8 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg gap-1 px-4 mt-2 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record First Action</span>
          </Button>
        </Card>
      ) : sortedActions.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-8 text-center text-xs text-slate-500">
          No corporate actions match your filters.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {sortedActions.map((act) => {
            const inst = instrumentMap.get(act.instrumentId);
            const instName = act.instrumentName || inst?.name || 'Instrument';
            const instSymbol = act.instrumentSymbol || inst?.symbol;

            return (
              <Card
                key={act.id}
                className="p-3.5 space-y-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-900/60 transition-all duration-200"
              >
                {/* Header Row: Badge + Ratio Left | Edit + Delete Buttons Right */}
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
                      title="Edit Corporate Action"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(act.instrumentId, act.id)}
                      disabled={deletingId === act.id}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Delete Corporate Action"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Instrument Info Row */}
                <div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                    {instName} {instSymbol ? `(${instSymbol})` : ''}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Ex-Date:{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                      {formatDate(act.exDate)}
                    </span>
                  </div>
                </div>

                {/* Demerger / Merger Banner */}
                {(act.type === 'demerger' || act.type === 'merger') && (
                  <div className="text-[11px] font-medium">
                    {act.type === 'demerger' ? (
                      <>
                        Child: <span className="font-bold">{act.targetInstrumentName || 'Child Instrument'}</span>{' '}
                        {act.targetInstrumentSymbol ? `(${act.targetInstrumentSymbol})` : ''} • Cost Alloc:{' '}
                        {act.costAllocationPct}%
                      </>
                    ) : (
                      <>
                        Merged into: <span className="font-bold">{act.targetInstrumentName || 'Acquirer Instrument'}</span>{' '}
                        {act.targetInstrumentSymbol ? `(${act.targetInstrumentSymbol})` : ''}
                      </>
                    )}
                  </div>
                )}

                {/* Notes Row */}
                {act.notes && (
                  <p className="text-[10px] text-slate-500 italic">
                    &quot;{act.notes}&quot;
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
