'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { createInstrument } from '@/actions/investments';
import { Instrument, InstrumentType } from '@/lib/types';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState<InstrumentType>(defaultType ?? 'stock');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [exchange, setExchange] = useState('NSE');
  const [isin, setIsin] = useState('');
  const [amfiCode, setAmfiCode] = useState('');
  const [yahooSymbol, setYahooSymbol] = useState('');
  const [userEditedYahoo, setUserEditedYahoo] = useState(false);
  const [currency, setCurrency] = useState('INR');

  useEffect(() => {
    if (open) {
      setManualOpen(!searchFirst);
    }
  }, [open, searchFirst]);

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

    setIsSubmitting(true);
    try {
      const res = await createInstrument({
        type,
        name: name.trim(),
        symbol: symbol.trim() || undefined,
        exchange: exchange.trim() || undefined,
        isin: isin.trim() || undefined,
        amfiCode: amfiCode.trim() || undefined,
        yahooSymbol: yahooSymbol.trim() || undefined,
        currency: currency.trim() || undefined,
      });

      if (res.success) {
        toast.success(`Created instrument ${res.data.name}`);
        setOpen(false);
        resetForm();
        onCreated?.(res.data);
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to create instrument: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
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
