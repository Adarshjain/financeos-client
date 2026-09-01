'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  deleteInvestmentTransaction,
  updateInvestmentTransaction,
} from '@/actions/investments';
import {
  Charges,
  InvestmentTransactionResponse,
  InvestmentTransactionType,
  SettlementType,
} from '@/lib/types';

interface UseEditTransactionDialogProps {
  transaction: InvestmentTransactionResponse;
  open: boolean;
  setOpen: (o: boolean) => void;
  onSuccess?: () => void;
}

export function useEditTransactionDialog({
  transaction,
  open,
  setOpen,
  onSuccess,
}: UseEditTransactionDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState<InvestmentTransactionType>(
    transaction.type
  );
  const [settlementType, setSettlementType] = useState<SettlementType>(
    transaction.settlementType || 'delivery'
  );
  const [quantity, setQuantity] = useState(transaction.quantity);
  const [price, setPrice] = useState(transaction.price);
  const [tradeDate, setTradeDate] = useState(
    transaction.tradeDate?.split('T')[0] || ''
  );
  const [notes, setNotes] = useState(transaction.notes || '');

  // Charges
  const [brokerage, setBrokerage] = useState(transaction.brokerage || '');
  const [stt, setStt] = useState(transaction.stt || '');
  const [exchangeTxnCharges, setExchangeTxnCharges] = useState(
    transaction.exchangeTxnCharges || ''
  );
  const [sebiCharges, setSebiCharges] = useState(
    transaction.sebiCharges || ''
  );
  const [stampDuty, setStampDuty] = useState(transaction.stampDuty || '');
  const [gst, setGst] = useState(transaction.gst || '');
  const [dpCharges, setDpCharges] = useState(transaction.dpCharges || '');
  const [otherCharges, setOtherCharges] = useState(
    transaction.otherCharges || ''
  );

  useEffect(() => {
    if (open) {
      setType(transaction.type);
      setSettlementType(transaction.settlementType || 'delivery');
      setQuantity(transaction.quantity);
      setPrice(transaction.price);
      setTradeDate(transaction.tradeDate?.split('T')[0] || '');
      setNotes(transaction.notes || '');
      setBrokerage(transaction.brokerage || '');
      setStt(transaction.stt || '');
      setExchangeTxnCharges(transaction.exchangeTxnCharges || '');
      setSebiCharges(transaction.sebiCharges || '');
      setStampDuty(transaction.stampDuty || '');
      setGst(transaction.gst || '');
      setDpCharges(transaction.dpCharges || '');
      setOtherCharges(transaction.otherCharges || '');
    }
  }, [open, transaction]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this trade transaction?'))
      return;
    setIsDeleting(true);
    try {
      const res = await deleteInvestmentTransaction(transaction.id);
      if (res.success) {
        toast.success('Transaction deleted');
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to delete transaction: ' + (err as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const charges: Charges = {};
    if (brokerage) charges.brokerage = Number(brokerage);
    if (stt) charges.stt = Number(stt);
    if (exchangeTxnCharges)
      charges.exchangeTxnCharges = Number(exchangeTxnCharges);
    if (sebiCharges) charges.sebiCharges = Number(sebiCharges);
    if (stampDuty) charges.stampDuty = Number(stampDuty);
    if (gst) charges.gst = Number(gst);
    if (dpCharges) charges.dpCharges = Number(dpCharges);
    if (otherCharges) charges.otherCharges = Number(otherCharges);

    try {
      const res = await updateInvestmentTransaction(transaction.id, {
        type,
        settlementType,
        quantity: Number(quantity),
        price: Number(price),
        tradeDate,
        charges,
        notes: notes || undefined,
      });

      if (res.success) {
        toast.success('Trade updated');
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to update trade: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isDeleting,
    isSubmitting,
    type,
    setType,
    settlementType,
    setSettlementType,
    quantity,
    setQuantity,
    price,
    setPrice,
    tradeDate,
    setTradeDate,
    notes,
    setNotes,
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
    handleDelete,
    handleSubmit,
  };
}
