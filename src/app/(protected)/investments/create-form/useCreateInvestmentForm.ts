'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { createInvestmentTransaction } from '@/actions/investments';
import { Broker } from '@/lib/account.types';
import { Instrument, InvestmentTransactionType } from '@/lib/types';

interface UseCreateInvestmentFormProps {
  brokerAccounts: Broker[];
  initialBrokerAccountId?: string;
  initialInstrument?: Instrument | null;
  onSuccess?: () => void;
}

export function useCreateInvestmentForm({
  brokerAccounts,
  initialBrokerAccountId,
  initialInstrument,
  onSuccess,
}: UseCreateInvestmentFormProps) {
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>(
    initialBrokerAccountId || brokerAccounts[0]?.id || ''
  );
  const [selectedInstrument, setSelectedInstrument] =
    useState<Instrument | null>(initialInstrument || null);
  const [type, setType] = useState<InvestmentTransactionType>('buy');

  const [showCharges, setShowCharges] = useState(false);
  const [brokerage, setBrokerage] = useState('');
  const [stt, setStt] = useState('');
  const [exchangeTxnCharges, setExchangeTxnCharges] = useState('');
  const [sebiCharges, setSebiCharges] = useState('');
  const [stampDuty, setStampDuty] = useState('');
  const [gst, setGst] = useState('');
  const [dpCharges, setDpCharges] = useState('');
  const [otherCharges, setOtherCharges] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const [quantityInput, setQuantityInput] = useState('');
  const [priceInput, setPriceInput] = useState('');

  const totalCharges = useMemo(() => {
    const b = parseFloat(brokerage) || 0;
    const s = parseFloat(stt) || 0;
    const e = parseFloat(exchangeTxnCharges) || 0;
    const sb = parseFloat(sebiCharges) || 0;
    const sd = parseFloat(stampDuty) || 0;
    const g = parseFloat(gst) || 0;
    const dp = parseFloat(dpCharges) || 0;
    const o = parseFloat(otherCharges) || 0;
    return b + s + e + sb + sd + g + dp + o;
  }, [
    brokerage,
    stt,
    exchangeTxnCharges,
    sebiCharges,
    stampDuty,
    gst,
    dpCharges,
    otherCharges,
  ]);

  const estGrossValue = useMemo(() => {
    const q = parseFloat(quantityInput) || 0;
    const p = parseFloat(priceInput) || 0;
    return q * p;
  }, [quantityInput, priceInput]);

  const estNetTotal = useMemo(() => {
    if (type === 'buy') {
      return estGrossValue + totalCharges;
    }
    return Math.max(0, estGrossValue - totalCharges);
  }, [type, estGrossValue, totalCharges]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBrokerId) {
      toast.error('Please select a broker account');
      return;
    }
    if (!selectedInstrument) {
      toast.error('Please select an instrument');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const quantityStr = formData.get('quantity') as string;
    const priceStr = formData.get('price') as string;
    const tradeDate = formData.get('tradeDate') as string;
    const notes = formData.get('notes') as string;

    const quantity = parseFloat(quantityStr);
    const price = parseFloat(priceStr);

    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (isNaN(price) || price < 0) {
      toast.error('Price cannot be negative');
      return;
    }
    if (!tradeDate) {
      toast.error('Trade date is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createInvestmentTransaction(null, {
        brokerAccountId: selectedBrokerId,
        instrumentId: selectedInstrument.id,
        type,
        quantity,
        price,
        tradeDate,
        charges: {
          brokerage: parseFloat(brokerage) || 0,
          stt: parseFloat(stt) || 0,
          exchangeTxnCharges: parseFloat(exchangeTxnCharges) || 0,
          sebiCharges: parseFloat(sebiCharges) || 0,
          stampDuty: parseFloat(stampDuty) || 0,
          gst: parseFloat(gst) || 0,
          dpCharges: parseFloat(dpCharges) || 0,
          otherCharges: parseFloat(otherCharges) || 0,
        },
        notes: notes || undefined,
      });

      if (res.success) {
        toast.success(
          `Recorded ${type.toUpperCase()} trade for ${selectedInstrument.name}`
        );
        // Reset form state
        setSelectedInstrument(null);
        setType('buy');
        setBrokerage('');
        setStt('');
        setExchangeTxnCharges('');
        setSebiCharges('');
        setStampDuty('');
        setGst('');
        setDpCharges('');
        setOtherCharges('');
        setShowCharges(false);
        setFormKey((k) => k + 1);
        onSuccess?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to record trade: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    selectedBrokerId,
    setSelectedBrokerId,
    selectedInstrument,
    setSelectedInstrument,
    type,
    setType,
    showCharges,
    setShowCharges,
    brokerage,
    setBrokerage,
    stt,
    setStt,
    exchangeTxnCharges,
    setExchangeTxnCharges,
    sebiCharges,
    setSebiCharges,
    stampDuty,
    setStampDuty,
    gst,
    setGst,
    dpCharges,
    setDpCharges,
    otherCharges,
    setOtherCharges,
    isSubmitting,
    formKey,
    quantityInput,
    setQuantityInput,
    priceInput,
    setPriceInput,
    totalCharges,
    estGrossValue,
    estNetTotal,
    handleSubmit,
  };
}
