'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import { CorporateAction, CreateCorporateActionRequest, UpdateCorporateActionRequest } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import { Instrument } from '@/lib/types';
import { toCalendarDate } from '@/lib/utils';

// The generated request enum only has the 4 lowercase action kinds (no legacy
// uppercase/actionType variants) — `@/lib/types`'s `CorporateActionType` is wider
// for historical reasons. See "Spec follow-ups" in the migration report.
export type CorporateActionKind = CreateCorporateActionRequest['type'];

interface UseCorporateActionsDialogProps {
  instrument?: {
    id: string;
    name: string;
    symbol?: string;
  };
  heldQuantity?: number;
  initialType?: CorporateActionKind;
  editAction?: CorporateAction;
  open: boolean;
  onSuccess?: () => void;
}

export function useCorporateActionsDialog({ instrument, heldQuantity, initialType, editAction, open, onSuccess }: UseCorporateActionsDialogProps) {
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);

  // Form state
  const [selectedParentInstrument, setSelectedParentInstrument] = useState<Instrument | null>(null);
  const [type, setType] = useState<CorporateActionKind>(initialType || 'split');
  const [ratioFrom, setRatioFrom] = useState('1');
  const [ratioTo, setRatioTo] = useState('2');
  const [exDate, setExDate] = useState(toCalendarDate(new Date()));
  const [notes, setNotes] = useState('');
  const [targetInstrument, setTargetInstrument] = useState<Instrument | null>(null);
  const [costAllocationPct, setCostAllocationPct] = useState('20');
  const [fractionalCashInLieu, setFractionalCashInLieu] = useState('');

  const activeInstrument =
    instrument ||
    (selectedParentInstrument
      ? {
          id: selectedParentInstrument.id,
          name: selectedParentInstrument.name,
          symbol: selectedParentInstrument.symbol,
        }
      : null);

  const activeInstrumentId = activeInstrument?.id;

  const {
    data: actionsData,
    isLoading,
    refetch: fetchActions,
  } = useQuery({
    queryKey: keys.investments.corporateActionsByInstrument(activeInstrumentId ?? ''),
    queryFn: async () =>
      (
        await api.GET('/api/v1/instruments/{instrumentId}/corporate-actions', {
          params: { path: { instrumentId: activeInstrumentId as string } },
        })
      ).data! as CorporateAction[],
    enabled: open && Boolean(activeInstrumentId),
  });
  const actions = actionsData ?? [];

  useEffect(() => {
    if (open && !editingActionId && initialType) {
      setType(initialType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialType]);

  const createMutation = useMutation({
    mutationFn: (body: CreateCorporateActionRequest) =>
      api
        .POST('/api/v1/instruments/{instrumentId}/corporate-actions', {
          params: { path: { instrumentId: activeInstrumentId as string } },
          body,
        })
        .then((r) => r.data! as CorporateAction),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; body: UpdateCorporateActionRequest }) =>
      api
        .PUT('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
          params: {
            path: { instrumentId: activeInstrumentId as string, id: vars.id },
          },
          body: vars.body,
        })
        .then((r) => r.data! as CorporateAction),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.DELETE('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
        params: { path: { instrumentId: activeInstrumentId as string, id } },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const resetForm = () => {
    setEditingActionId(null);
    setSelectedParentInstrument(null);
    setType(initialType || 'split');
    setRatioFrom('1');
    setRatioTo('2');
    setExDate(toCalendarDate(new Date()));
    setNotes('');
    setTargetInstrument(null);
    setCostAllocationPct('20');
    setFractionalCashInLieu('');
  };

  const handleEditClick = (act: CorporateAction) => {
    setEditingActionId(act.id);
    if (!instrument && act.instrumentId) {
      setSelectedParentInstrument({
        id: act.instrumentId,
        type: 'stock',
        name: act.instrumentName || 'Instrument',
        symbol: act.instrumentSymbol,
        currency: 'INR',
      });
    }
    setType(act.type);
    setRatioFrom(String(act.ratioFrom));
    setRatioTo(String(act.ratioTo));
    setExDate(act.exDate?.split('T')[0] || toCalendarDate(new Date()));
    setNotes(act.notes || '');
    if (act.targetInstrumentId) {
      setTargetInstrument({
        id: act.targetInstrumentId,
        type: 'stock',
        name: act.targetInstrumentName || 'Target Instrument',
        symbol: act.targetInstrumentSymbol,
        currency: 'INR',
      });
    } else {
      setTargetInstrument(null);
    }
    setCostAllocationPct(act.costAllocationPct ? String(act.costAllocationPct) : '20');
    setFractionalCashInLieu(act.fractionalCashInLieu !== undefined && act.fractionalCashInLieu !== null ? String(act.fractionalCashInLieu) : '');
  };

  useEffect(() => {
    if (open && editAction) {
      handleEditClick(editAction);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editAction?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInstrument?.id) {
      toast.error('Please select an instrument.');
      return;
    }
    const fromNum = Number(ratioFrom);
    const toNum = Number(ratioTo);

    if (!fromNum || fromNum <= 0 || !toNum || toNum <= 0) {
      toast.error('Please enter valid ratio numbers.');
      return;
    }
    if (!exDate) {
      toast.error('Ex-date is required.');
      return;
    }

    if (type === 'demerger' || type === 'merger') {
      if (!targetInstrument?.id) {
        toast.error(`Target ${type === 'merger' ? 'acquirer' : 'child'} instrument is required.`);
        return;
      }
      if (targetInstrument.id === activeInstrument.id) {
        toast.error('Target instrument must be different from parent instrument.');
        return;
      }
      if (type === 'demerger') {
        const costPctNum = Number(costAllocationPct);
        if (!costPctNum || costPctNum <= 0 || costPctNum > 100) {
          toast.error('Cost allocation % must be between 0 and 100.');
          return;
        }
      }
    }

    const payload: CreateCorporateActionRequest | UpdateCorporateActionRequest = {
      type,
      ratioFrom: fromNum,
      ratioTo: toNum,
      exDate,
      notes: notes || undefined,
      targetInstrumentId: type === 'demerger' || type === 'merger' ? targetInstrument?.id : undefined,
      costAllocationPct: type === 'demerger' ? Number(costAllocationPct) : undefined,
      fractionalCashInLieu: type === 'demerger' || type === 'merger' ? (fractionalCashInLieu ? Number(fractionalCashInLieu) : 0) : undefined,
    };

    try {
      if (editingActionId) {
        await updateMutation.mutateAsync({
          id: editingActionId,
          body: payload,
        });
        toast.success(`Updated ${type} (${ratioFrom}:${ratioTo})`);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(`Recorded ${type} (${ratioFrom}:${ratioTo}) for ${activeInstrument.name}`);
      }
      resetForm();
      fetchActions();
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.response.message : 'Failed to save corporate action');
    }
  };

  const handleDelete = async (actionId: string) => {
    if (!activeInstrument?.id) return;
    if (!confirm('Are you sure you want to delete this corporate action?')) return;
    setDeletingId(actionId);
    try {
      await deleteMutation.mutateAsync(actionId);
      toast.success('Corporate action deleted');
      if (editingActionId === actionId) resetForm();
      fetchActions();
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.response.message : 'Failed to delete corporate action');
    } finally {
      setDeletingId(null);
    }
  };

  const fromNum = Number(ratioFrom);
  const toNum = Number(ratioTo);
  const hasValidRatio = fromNum > 0 && toNum > 0;
  const entitlement = heldQuantity !== undefined && heldQuantity > 0 && hasValidRatio ? (heldQuantity * toNum) / fromNum : 0;
  const wholeShares = Math.floor(entitlement);
  const fracShares = entitlement > 0 ? Number((entitlement - wholeShares).toFixed(4)) : 0;
  const showCashInLieuField = (type === 'demerger' || type === 'merger') && (heldQuantity === undefined || fracShares > 0 || (editingActionId !== null && Boolean(fractionalCashInLieu)));

  return {
    actions,
    isLoading,
    isSubmitting,
    deletingId,
    editingActionId,
    selectedParentInstrument,
    setSelectedParentInstrument,
    type,
    setType,
    ratioFrom,
    setRatioFrom,
    ratioTo,
    setRatioTo,
    exDate,
    setExDate,
    notes,
    setNotes,
    targetInstrument,
    setTargetInstrument,
    costAllocationPct,
    setCostAllocationPct,
    fractionalCashInLieu,
    setFractionalCashInLieu,
    activeInstrument,
    hasValidRatio,
    fracShares,
    wholeShares,
    showCashInLieuField,
    resetForm,
    handleEditClick,
    handleSubmit,
    handleDelete,
  };
}
