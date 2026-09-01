'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { deleteCorporateAction } from '@/actions/investments';
import { CorporateAction, Instrument } from '@/lib/types';

import { SortOrder } from './CorporateActionsFilterBar';

interface UseCorporateActionsSectionProps {
  corporateActions: CorporateAction[];
  instruments: Instrument[];
}

export function useCorporateActionsSection({
  corporateActions,
  instruments,
}: UseCorporateActionsSectionProps) {
  const router = useRouter();
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dialog state for adding/editing corporate actions
  const [activeDialogInstrument, setActiveDialogInstrument] =
    useState<Instrument | null>(null);
  const [activeEditAction, setActiveEditAction] =
    useState<CorporateAction | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const handleSearchChange = (val: string) => {
    setSearch(val);
  };

  const handleDelete = async (instrumentId: string, actionId: string) => {
    if (!confirm('Are you sure you want to delete this corporate action?'))
      return;
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
      toast.error(
        'Failed to delete corporate action: ' + (err as Error).message
      );
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

  return {
    search,
    typeFilter,
    setTypeFilter,
    sortOrder,
    deletingId,
    activeDialogInstrument,
    activeEditAction,
    dialogOpen,
    setDialogOpen,
    handleSearchChange,
    handleDelete,
    toggleSort,
    instrumentMap,
    sortedActions,
    openCreateDialog,
    openEditDialog,
  };
}
