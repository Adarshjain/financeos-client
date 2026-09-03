'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import { CorporateAction } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import { Instrument } from '@/lib/types';

import { SortOrder } from './CorporateActionsFilterBar';

export function useCorporateActionsSection() {
  const qc = useQueryClient();

  const { data: corporateActionsData, isLoading: isLoadingActions } = useQuery({
    queryKey: keys.investments.corporateActions(),
    queryFn: async () =>
      (await api.GET('/api/v1/corporate-actions')).data! as CorporateAction[],
  });
  const corporateActions = useMemo(
    () => corporateActionsData ?? [],
    [corporateActionsData]
  );

  const { data: instrumentsData } = useQuery({
    queryKey: keys.investments.instruments(),
    queryFn: async () =>
      (await api.GET('/api/v1/instruments', { params: { query: {} } }))
        .data! as Instrument[],
  });
  const instruments = useMemo(() => instrumentsData ?? [], [instrumentsData]);

  const deleteMutation = useMutation({
    mutationFn: (vars: { instrumentId: string; actionId: string }) =>
      api.DELETE('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
        params: {
          path: { instrumentId: vars.instrumentId, id: vars.actionId },
        },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });

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
      await deleteMutation.mutateAsync({ instrumentId, actionId });
      toast.success('Corporate action deleted successfully');
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.response.message
          : 'Failed to delete corporate action'
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
    corporateActions,
    instruments,
    isLoadingActions,
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
