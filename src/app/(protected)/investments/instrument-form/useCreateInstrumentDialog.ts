'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import {
  CreateInstrumentRequest,
  Instrument,
  InstrumentType,
} from '@/lib/types';

interface UseCreateInstrumentDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onCreated?: (instrument: Instrument) => void;
  initialMode?: 'search' | 'manual';
  defaultType?: InstrumentType;
}

export function useCreateInstrumentDialog({
  open,
  setOpen,
  onCreated,
  initialMode = 'search',
  defaultType,
}: UseCreateInstrumentDialogProps) {
  const searchFirst = initialMode !== 'manual';
  const [manualOpen, setManualOpen] = useState(!searchFirst);
  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (body: CreateInstrumentRequest) =>
      api
        .POST('/api/v1/instruments', { body })
        .then((r) => r.data! as Instrument),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const isSubmitting = createMutation.isPending;

  const [type, setType] = useState<InstrumentType>(defaultType ?? 'stock');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [exchange, setExchange] = useState('NSE');
  const [isin, setIsin] = useState('');
  const [amfiCode, setAmfiCode] = useState('');
  const [yahooSymbol, setYahooSymbol] = useState('');
  const [userEditedYahoo, setUserEditedYahoo] = useState(false);
  const [currency, setCurrency] = useState('INR');

  // Reset which sub-form is open whenever the dialog transitions to open.
  // Adjusted during render (React's documented alternative to an effect for
  // "reset state when a prop changes") rather than in a useEffect, so this
  // doesn't trigger a synchronous setState-in-effect cascade.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setManualOpen(!searchFirst);
    }
  }

  const resetForm = () => {
    setName('');
    setSymbol('');
    setIsin('');
    setAmfiCode('');
    setYahooSymbol('');
    setUserEditedYahoo(false);
  };

  const handleResolved = (instrument: Instrument) => {
    onCreated?.(instrument);
    setOpen(false);
  };

  const handleSymbolChange = (val: string) => {
    setSymbol(val);
    if ((type === 'stock' || type === 'etf') && !userEditedYahoo) {
      setYahooSymbol(val.trim() ? `${val.trim().toUpperCase()}.NS` : '');
    }
  };

  const handleTypeChange = (newType: InstrumentType) => {
    setType(newType);
    if (
      (newType === 'stock' || newType === 'etf') &&
      symbol &&
      !userEditedYahoo
    ) {
      setYahooSymbol(`${symbol.trim().toUpperCase()}.NS`);
    }
  };

  const handleYahooChange = (val: string) => {
    setYahooSymbol(val);
    setUserEditedYahoo(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Instrument name is required');
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        type,
        name: name.trim(),
        symbol: symbol.trim() || undefined,
        exchange: exchange.trim() || undefined,
        isin: isin.trim() || undefined,
        amfiCode: amfiCode.trim() || undefined,
        yahooSymbol: yahooSymbol.trim() || undefined,
        currency: currency.trim() || undefined,
      });

      toast.success(`Created instrument ${created.name}`);
      setOpen(false);
      resetForm();
      onCreated?.(created);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.response.message
          : 'Failed to create instrument'
      );
    }
  };

  return {
    searchFirst,
    manualOpen,
    setManualOpen,
    isSubmitting,
    type,
    name,
    setName,
    symbol,
    exchange,
    setExchange,
    isin,
    setIsin,
    amfiCode,
    setAmfiCode,
    yahooSymbol,
    currency,
    setCurrency,
    handleResolved,
    handleSymbolChange,
    handleTypeChange,
    handleYahooChange,
    handleSubmit,
  };
}
