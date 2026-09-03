'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import { UpdateInvestmentTransactionRequest } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import {
  InvestmentTransactionResponse,
  InvestmentTransactionType,
  SettlementType,
} from '@/lib/types';

// The generated `ItemizedChargesDto` allows `number | null` per field; our local
// `Charges` (@/lib/types) types money as `number | string` to mirror the wire's
// decimal-as-string convention on read. This form only ever writes plain numbers,
// so derive the charges shape straight from the request type we actually submit.
type ChargesInput = NonNullable<UpdateInvestmentTransactionRequest['charges']>;

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
  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () =>
      api.DELETE('/api/v1/investments/transactions/{id}', {
        params: { path: { id: transaction.id } },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const updateMutation = useMutation({
    mutationFn: (body: UpdateInvestmentTransactionRequest) =>
      api
        .PUT('/api/v1/investments/transactions/{id}', {
          params: { path: { id: transaction.id } },
          body,
        })
        .then((r) => r.data! as InvestmentTransactionResponse),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const isDeleting = deleteMutation.isPending;
  const isSubmitting = updateMutation.isPending;

  const [type, setType] = useState<InvestmentTransactionType>(transaction.type);
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
  const [sebiCharges, setSebiCharges] = useState(transaction.sebiCharges || '');
  const [stampDuty, setStampDuty] = useState(transaction.stampDuty || '');
  const [gst, setGst] = useState(transaction.gst || '');
  const [dpCharges, setDpCharges] = useState(transaction.dpCharges || '');
  const [otherCharges, setOtherCharges] = useState(
    transaction.otherCharges || ''
  );

  // Reset the form from `transaction` whenever the dialog transitions to open.
  // Adjusted during render (React's documented alternative to an effect for
  // "reset state when a prop changes") rather than in a useEffect, so this
  // doesn't trigger a synchronous setState-in-effect cascade.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
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
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this trade transaction?'))
      return;
    try {
      await deleteMutation.mutateAsync();
      toast.success('Transaction deleted');
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.response.message
          : 'Failed to delete transaction'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const charges: ChargesInput = {};
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
      await updateMutation.mutateAsync({
        type,
        settlementType,
        quantity: Number(quantity),
        price: Number(price),
        tradeDate,
        charges,
        notes: notes || undefined,
      });

      toast.success('Trade updated');
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.response.message
          : 'Failed to update trade'
      );
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
