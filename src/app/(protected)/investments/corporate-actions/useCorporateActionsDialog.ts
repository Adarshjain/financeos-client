'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  createCorporateAction,
  deleteCorporateAction,
  getCorporateActions,
  updateCorporateAction,
} from '@/actions/investments';
import { CorporateAction, CorporateActionType, Instrument } from '@/lib/types';
import { toCalendarDate } from '@/lib/utils';

interface UseCorporateActionsDialogProps {
  instrument?: {
    id: string;
    name: string;
    symbol?: string;
  };
  heldQuantity?: number;
  initialType?: CorporateActionType;
  editAction?: CorporateAction;
  open: boolean;
  onSuccess?: () => void;
}

export function useCorporateActionsDialog({
  instrument,
  heldQuantity,
  initialType,
  editAction,
  open,
  onSuccess,
}: UseCorporateActionsDialogProps) {
  const router = useRouter();

  const [actions, setActions] = useState<CorporateAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);

  // Form state
  const [selectedParentInstrument, setSelectedParentInstrument] =
    useState<Instrument | null>(null);
  const [type, setType] = useState<CorporateActionType>(
    initialType || 'split'
  );
  const [ratioFrom, setRatioFrom] = useState('1');
  const [ratioTo, setRatioTo] = useState('2');
  const [exDate, setExDate] = useState(toCalendarDate(new Date()));
  const [notes, setNotes] = useState('');
  const [targetInstrument, setTargetInstrument] = useState<Instrument | null>(
    null
  );
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

  const fetchActions = useCallback(async () => {
    if (!activeInstrument?.id) return;
    setIsLoading(true);
    try {
      const res = await getCorporateActions(activeInstrument.id);
      if (res.success) {
        setActions(res.data || []);
      }
    } catch {
      // Ignore initial error fallback
    } finally {
      setIsLoading(false);
    }
  }, [activeInstrument?.id]);

  useEffect(() => {
    if (open) {
      if (!editingActionId && initialType) {
        setType(initialType);
      }
      fetchActions();
    }
  }, [open, fetchActions, initialType, editingActionId]);

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
    setCostAllocationPct(
      act.costAllocationPct ? String(act.costAllocationPct) : '20'
    );
    setFractionalCashInLieu(
      act.fractionalCashInLieu !== undefined &&
        act.fractionalCashInLieu !== null
        ? String(act.fractionalCashInLieu)
        : ''
    );
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
        toast.error(
          `Target ${type === 'merger' ? 'acquirer' : 'child'} instrument is required.`
        );
        return;
      }
      if (targetInstrument.id === activeInstrument.id) {
        toast.error(
          'Target instrument must be different from parent instrument.'
        );
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

    setIsSubmitting(true);
    try {
      const payload = {
        type,
        ratioFrom: fromNum,
        ratioTo: toNum,
        exDate,
        notes: notes || undefined,
        targetInstrumentId:
          type === 'demerger' || type === 'merger'
            ? targetInstrument?.id
            : undefined,
        costAllocationPct:
          type === 'demerger' ? Number(costAllocationPct) : undefined,
        fractionalCashInLieu:
          type === 'demerger' || type === 'merger'
            ? fractionalCashInLieu
              ? Number(fractionalCashInLieu)
              : 0
            : undefined,
      };

      if (editingActionId) {
        const res = await updateCorporateAction(
          activeInstrument.id,
          editingActionId,
          payload
        );

        if (res.success) {
          toast.success(`Updated ${type} (${ratioFrom}:${ratioTo})`);
          resetForm();
          fetchActions();
          router.refresh();
          onSuccess?.();
        } else {
          toast.error(res.error.message);
        }
      } else {
        const res = await createCorporateAction(activeInstrument.id, payload);

        if (res.success) {
          toast.success(
            `Recorded ${type} (${ratioFrom}:${ratioTo}) for ${activeInstrument.name}`
          );
          resetForm();
          fetchActions();
          router.refresh();
          onSuccess?.();
        } else {
          toast.error(res.error.message);
        }
      }
    } catch (err) {
      toast.error('Failed to save corporate action: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (actionId: string) => {
    if (!activeInstrument?.id) return;
    if (!confirm('Are you sure you want to delete this corporate action?'))
      return;
    setDeletingId(actionId);
    try {
      const res = await deleteCorporateAction(activeInstrument.id, actionId);
      if (res.success) {
        toast.success('Corporate action deleted');
        if (editingActionId === actionId) resetForm();
        fetchActions();
        router.refresh();
        onSuccess?.();
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

  const fromNum = Number(ratioFrom);
  const toNum = Number(ratioTo);
  const hasValidRatio = fromNum > 0 && toNum > 0;
  const entitlement =
    heldQuantity !== undefined && heldQuantity > 0 && hasValidRatio
      ? (heldQuantity * toNum) / fromNum
      : 0;
  const wholeShares = Math.floor(entitlement);
  const fracShares =
    entitlement > 0 ? Number((entitlement - wholeShares).toFixed(4)) : 0;
  const showCashInLieuField =
    (type === 'demerger' || type === 'merger') &&
    (heldQuantity === undefined ||
      fracShares > 0 ||
      (editingActionId !== null && Boolean(fractionalCashInLieu)));

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
