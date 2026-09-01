'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { createDividend, updateDividend } from '@/actions/investments';
import { Broker } from '@/lib/account.types';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [brokerAccountId, setBrokerAccountId] = useState(
    dividend?.brokerAccountId ||
      initialBrokerAccountId ||
      brokerAccounts[0]?.id ||
      ''
  );
  const [instrumentId, setInstrumentId] = useState(
    dividend?.instrumentId || initialInstrumentId || ''
  );
  const [type, setType] = useState<DividendType>(
    dividend?.type || 'dividend'
  );
  const [amount, setAmount] = useState(
    dividend?.amount ? String(dividend.amount) : ''
  );
  const [perUnit, setPerUnit] = useState(
    dividend?.perUnit ? String(dividend.perUnit) : ''
  );
  const [tds, setTds] = useState(
    dividend?.tds ? String(dividend.tds) : ''
  );
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

    setIsSubmitting(true);
    const req = {
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

    const res =
      isEdit && dividend
        ? await updateDividend(dividend.id, req)
        : await createDividend(req);

    setIsSubmitting(false);

    if (res.success) {
      toast.success(isEdit ? 'Dividend updated' : 'Dividend recorded');
      setOpen(false);
      onSuccess?.();
    } else {
      toast.error(res.error.message);
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
