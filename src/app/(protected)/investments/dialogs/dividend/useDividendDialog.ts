'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Broker } from '@/lib/account.types';
import { api, ApiError } from '@/lib/api/client';
import { CreateDividendRequest, UpdateDividendRequest } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import { Dividend, DividendType, Position } from '@/lib/types';
import { toCalendarDate } from '@/lib/utils';

interface UseDividendDialogProps {
  mode?: 'create' | 'edit';
  dividend?: Dividend;
  brokerAccounts: Broker[];
  positions?: Position[];
  initialBrokerAccountId?: string;
  initialInstrumentId?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSuccess?: () => void;
}

export function useDividendDialog({
  mode = 'create',
  dividend,
  brokerAccounts,
  positions = [],
  initialBrokerAccountId,
  initialInstrumentId,
  open,
  setOpen,
  onSuccess,
}: UseDividendDialogProps) {
  const isEdit = mode === 'edit' || !!dividend;
  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (body: CreateDividendRequest) =>
      api
        .POST('/api/v1/investments/dividends', { body })
        .then((r) => r.data! as Dividend),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const updateMutation = useMutation({
    mutationFn: (body: UpdateDividendRequest) =>
      api
        .PUT('/api/v1/investments/dividends/{id}', {
          params: { path: { id: dividend?.id ?? '' } },
          body,
        })
        .then((r) => r.data! as Dividend),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [brokerAccountId, setBrokerAccountId] = useState(
    dividend?.brokerAccountId ||
      initialBrokerAccountId ||
      brokerAccounts[0]?.id ||
      ''
  );
  const [instrumentId, setInstrumentId] = useState(
    dividend?.instrumentId || initialInstrumentId || ''
  );
  const [type, setType] = useState<DividendType>(dividend?.type || 'dividend');
  const [amount, setAmount] = useState(
    dividend?.amount ? String(dividend.amount) : ''
  );
  const [perUnit, setPerUnit] = useState(
    dividend?.perUnit ? String(dividend.perUnit) : ''
  );
  const [tds, setTds] = useState(dividend?.tds ? String(dividend.tds) : '');
  const [exDate, setExDate] = useState(dividend?.exDate || '');
  const [payDate, setPayDate] = useState(
    dividend?.payDate || toCalendarDate(new Date())
  );
  const [notes, setNotes] = useState(dividend?.notes || '');

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      if (dividend) {
        setBrokerAccountId(dividend.brokerAccountId);
        setInstrumentId(dividend.instrumentId);
        setType(dividend.type);
        setAmount(String(dividend.amount));
        setPerUnit(dividend.perUnit ? String(dividend.perUnit) : '');
        setTds(dividend.tds ? String(dividend.tds) : '');
        setExDate(dividend.exDate || '');
        setPayDate(dividend.payDate);
        setNotes(dividend.notes || '');
      } else {
        setBrokerAccountId(
          initialBrokerAccountId || brokerAccounts[0]?.id || ''
        );
        setInstrumentId(initialInstrumentId || '');
      }
    }
  }

  const brokerPositions = positions.filter(
    (p) => !brokerAccountId || p.brokerAccountId === brokerAccountId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!brokerAccountId) {
      toast.error('Please select a broker account.');
      return;
    }
    if (!instrumentId) {
      toast.error('Please select a held instrument.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    try {
      if (isEdit && dividend) {
        const req: UpdateDividendRequest = {
          type,
          amount: numAmount,
          perUnit: perUnit ? parseFloat(perUnit) : undefined,
          tds: tds ? parseFloat(tds) : undefined,
          exDate: exDate || undefined,
          payDate,
          notes: notes.trim() || undefined,
        };
        await updateMutation.mutateAsync(req);
      } else {
        const req: CreateDividendRequest = {
          brokerAccountId,
          instrumentId,
          type,
          amount: numAmount,
          perUnit: perUnit ? parseFloat(perUnit) : undefined,
          tds: tds ? parseFloat(tds) : undefined,
          exDate: exDate || undefined,
          payDate,
          notes: notes.trim() || undefined,
        };
        await createMutation.mutateAsync(req);
      }

      toast.success(isEdit ? 'Dividend updated' : 'Dividend recorded');
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.response.message
          : 'Failed to save dividend'
      );
    }
  };

  return {
    isEdit,
    isSubmitting,
    brokerAccountId,
    setBrokerAccountId,
    instrumentId,
    setInstrumentId,
    type,
    setType,
    amount,
    setAmount,
    perUnit,
    setPerUnit,
    tds,
    setTds,
    exDate,
    setExDate,
    payDate,
    setPayDate,
    notes,
    setNotes,
    brokerPositions,
    handleSubmit,
  };
}
