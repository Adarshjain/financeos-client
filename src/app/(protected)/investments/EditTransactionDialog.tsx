'use client';

import { Edit, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { deleteInvestmentTransaction, updateInvestmentTransaction } from '@/actions/investments';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Charges, InvestmentTransactionResponse, InvestmentTransactionType } from '@/lib/types';

interface EditTransactionDialogProps {
  transaction: InvestmentTransactionResponse;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EditTransactionDialog({
  transaction,
  trigger,
  onSuccess,
}: EditTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState<InvestmentTransactionType>(transaction.type);
  const [quantity, setQuantity] = useState(transaction.quantity);
  const [price, setPrice] = useState(transaction.price);
  const [tradeDate, setTradeDate] = useState(transaction.tradeDate?.split('T')[0] || '');
  const [notes, setNotes] = useState(transaction.notes || '');

  // Charges
  const [brokerage, setBrokerage] = useState(transaction.brokerage || '');
  const [stt, setStt] = useState(transaction.stt || '');
  const [exchangeTxnCharges, setExchangeTxnCharges] = useState(transaction.exchangeTxnCharges || '');
  const [sebiCharges, setSebiCharges] = useState(transaction.sebiCharges || '');
  const [stampDuty, setStampDuty] = useState(transaction.stampDuty || '');
  const [gst, setGst] = useState(transaction.gst || '');
  const [dpCharges, setDpCharges] = useState(transaction.dpCharges || '');
  const [otherCharges, setOtherCharges] = useState(transaction.otherCharges || '');

  useEffect(() => {
    if (open) {
      setType(transaction.type);
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
    if (!confirm('Are you sure you want to delete this trade transaction?')) return;
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
    if (exchangeTxnCharges) charges.exchangeTxnCharges = Number(exchangeTxnCharges);
    if (sebiCharges) charges.sebiCharges = Number(sebiCharges);
    if (stampDuty) charges.stampDuty = Number(stampDuty);
    if (gst) charges.gst = Number(gst);
    if (dpCharges) charges.dpCharges = Number(dpCharges);
    if (otherCharges) charges.otherCharges = Number(otherCharges);

    try {
      const res = await updateInvestmentTransaction(transaction.id, {
        type,
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

  const instrumentName = transaction.instrument.name;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
            <Edit className="w-3.5 h-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center justify-between">
            <span>Edit Trade ({instrumentName})</span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-7 text-xs px-2 bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Modify transaction details for {instrumentName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Broker + Instrument are the trade's identity and can't be changed on edit. */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Broker Account</Label>
            <div className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
              {transaction.brokerName} {transaction.provider ? `(${transaction.provider})` : ''}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Instrument</Label>
            <div className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
              {transaction.instrument.name}
              {transaction.instrument.symbol ? ` (${transaction.instrument.symbol})` : ''}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Type</Label>
              <Select value={type} onValueChange={(val) => setType(val as InvestmentTransactionType)}>
                <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectItem value="buy" className="text-xs">Buy</SelectItem>
                  <SelectItem value="sell" className="text-xs">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <FormField
              label="Trade Date"
              name="tradeDate"
              type="date"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Quantity"
              name="quantity"
              type="number"
              step="0.0001"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />

            <FormField
              label="Price (INR)"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Itemized Charges</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <Label className="text-[10px] text-slate-500">Brokerage</Label>
                <input
                  type="number"
                  step="0.01"
                  value={brokerage}
                  onChange={(e) => setBrokerage(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">STT</Label>
                <input
                  type="number"
                  step="0.01"
                  value={stt}
                  onChange={(e) => setStt(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Exch Txn</Label>
                <input
                  type="number"
                  step="0.01"
                  value={exchangeTxnCharges}
                  onChange={(e) => setExchangeTxnCharges(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">SEBI Fee</Label>
                <input
                  type="number"
                  step="0.01"
                  value={sebiCharges}
                  onChange={(e) => setSebiCharges(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Stamp Duty</Label>
                <input
                  type="number"
                  step="0.01"
                  value={stampDuty}
                  onChange={(e) => setStampDuty(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">GST</Label>
                <input
                  type="number"
                  step="0.01"
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">DP Charges</Label>
                <input
                  type="number"
                  step="0.01"
                  value={dpCharges}
                  onChange={(e) => setDpCharges(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Other</Label>
                <input
                  type="number"
                  step="0.01"
                  value={otherCharges}
                  onChange={(e) => setOtherCharges(e.target.value)}
                  className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                />
              </div>
            </div>
          </div>

          <FormField
            label="Notes"
            name="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
          />

          <DialogFooter className="pt-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
