'use client';

import { DollarSign, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { createDividend } from '@/actions/investments';
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
import { Broker } from '@/lib/account.types';
import { DividendType, Position } from '@/lib/types';
import { toCalendarDate } from '@/lib/utils';

interface CreateDividendDialogProps {
  brokerAccounts: Broker[];
  positions?: Position[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function CreateDividendDialog({
  brokerAccounts,
  positions = [],
  trigger,
  onSuccess,
}: CreateDividendDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [brokerAccountId, setBrokerAccountId] = useState(brokerAccounts[0]?.id || '');
  const [instrumentId, setInstrumentId] = useState('');
  const [type, setType] = useState<DividendType>('dividend');
  const [amount, setAmount] = useState('');
  const [perUnit, setPerUnit] = useState('');
  const [tds, setTds] = useState('');
  const [exDate, setExDate] = useState('');
  const [payDate, setPayDate] = useState(toCalendarDate(new Date()));
  const [notes, setNotes] = useState('');

  // Filter positions by selected broker
  const brokerPositions = positions.filter((p) => !brokerAccountId || p.brokerAccountId === brokerAccountId);

  const handleBrokerChange = (newBrokerId: string) => {
    setBrokerAccountId(newBrokerId);
    setInstrumentId('');
  };

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
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createDividend({
        brokerAccountId,
        instrumentId,
        type,
        amount: Number(amount),
        perUnit: perUnit ? Number(perUnit) : undefined,
        tds: tds ? Number(tds) : undefined,
        exDate: exDate || undefined,
        payDate,
        notes: notes || undefined,
      });

      if (res.success) {
        toast.success(`Recorded ${type} payout of ₹${amount}`);
        setOpen(false);
        // Reset form
        setAmount('');
        setPerUnit('');
        setTds('');
        setNotes('');
        setInstrumentId('');
        onSuccess?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to record dividend: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            Record Dividend / Income
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Record Income / Dividend
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Add dividends or interest received on your held positions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Broker Account</Label>
            <Select value={brokerAccountId} onValueChange={handleBrokerChange}>
              <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                <SelectValue placeholder="Select broker..." />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                {brokerAccounts.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.name} ({b.provider || 'Broker'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Held Instrument</Label>
            <Select value={instrumentId} onValueChange={setInstrumentId}>
              <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                <SelectValue placeholder={brokerPositions.length === 0 ? "No held positions for this broker" : "Select held instrument..."} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                {brokerPositions.map((p) => (
                  <SelectItem key={p.instrument.id} value={p.instrument.id} className="text-xs">
                    {p.instrument.name} {p.instrument.symbol ? `(${p.instrument.symbol})` : `[${p.instrument.type}]`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Type</Label>
              <Select value={type} onValueChange={(val) => setType(val as DividendType)}>
                <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectItem value="dividend" className="text-xs">Dividend</SelectItem>
                  <SelectItem value="interest" className="text-xs">Interest</SelectItem>
                  <SelectItem value="other" className="text-xs">Other Payout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <FormField
              label="Payment Date"
              name="payDate"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Total Amount (INR)"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />

            <FormField
              label="TDS Deducted (INR)"
              name="tds"
              type="number"
              step="0.01"
              min="0"
              value={tds}
              onChange={(e) => setTds(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Per Unit Amount (Optional)"
              name="perUnit"
              type="number"
              step="0.0001"
              min="0"
              value={perUnit}
              onChange={(e) => setPerUnit(e.target.value)}
              placeholder="e.g. 5.50"
            />

            <FormField
              label="Ex-Date (Optional)"
              name="exDate"
              type="date"
              value={exDate}
              onChange={(e) => setExDate(e.target.value)}
            />
          </div>

          <FormField
            label="Notes"
            name="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes / reference"
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
              {isSubmitting ? 'Saving...' : 'Record Payout'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
