'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { CorporateAction } from '@/lib/api/types';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

import { CORPORATE_ACTION_GONE_MESSAGE, isCorporateActionGone } from '../corporate-actions/corporateActionGone';
import { SortOrder } from './CorporateActionsFilterBar';

/** The instrument a corporate-action dialog opens on, as the action response names it. */
interface DialogInstrument {
  id: string;
  name: string;
  symbol?: string | null;
}

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

  const deleteMutation = useMutation({
    mutationFn: (vars: { instrumentId: string; actionId: string }) =>
      api.DELETE('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
        params: {
          path: { instrumentId: vars.instrumentId, id: vars.actionId },
        },
      }),
    onSuccess: () => invalidateInvestmentQueries(qc),
  });

  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dialog state for adding/editing corporate actions
  const [activeDialogInstrument, setActiveDialogInstrument] =
    useState<DialogInstrument | null>(null);
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
      if (isCorporateActionGone(err)) {
        // Already deleted elsewhere (or not this user's): drop the stale row instead of failing.
        toast.info(CORPORATE_ACTION_GONE_MESSAGE);
        await invalidateInvestmentQueries(qc);
      } else {
        toastError(err, 'Failed to delete corporate action');
      }
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

  const filteredActions = useMemo(() => {
    return corporateActions.filter((act) => {
      // The response names both instruments, so no catalog lookup is needed.
      const name = act.instrumentName || '';
      const symbol = act.instrumentSymbol || '';
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
  }, [corporateActions, search, typeFilter]);

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
    setActiveDialogInstrument({
      id: act.instrumentId,
      name: act.instrumentName || 'Instrument',
      symbol: act.instrumentSymbol,
    });
    setActiveEditAction(act);
    setDialogOpen(true);
  };

  return {
    corporateActions,
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
    sortedActions,
    openCreateDialog,
    openEditDialog,
  };
}
