'use client';

import { Edit, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { createDividend, updateDividend } from '@/actions/investments';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Broker } from '@/lib/account.types';
import { Dividend, DividendType, Position } from '@/lib/types';
import { toCalendarDate } from '@/lib/utils';

export interface DividendDialogProps {
  mode?: 'create' | 'edit';
  dividend?: Dividend;
  brokerAccounts: Broker[];
  positions?: Position[];
  initialBrokerAccountId?: string;
  initialInstrumentId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function DividendDialog({
  mode = 'create',
  dividend,
  brokerAccounts,
  positions = [],
  initialBrokerAccountId,
  initialInstrumentId,
  trigger,
  onSuccess,
}: DividendDialogProps) {
  const isEdit = mode === 'edit' || !!dividend;
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [brokerAccountId, setBrokerAccountId] = useState(
    dividend?.brokerAccountId || initialBrokerAccountId || brokerAccounts[0]?.id || '',
  );
  const [instrumentId, setInstrumentId] = useState(
    dividend?.instrumentId || initialInstrumentId || '',
  );
  const [type, setType] = useState<DividendType>(dividend?.type || 'dividend');
  const [amount, setAmount] = useState(dividend?.amount ? String(dividend.amount) : '');
  const [perUnit, setPerUnit] = useState(dividend?.perUnit ? String(dividend.perUnit) : '');
  const [tds, setTds] = useState(dividend?.tds ? String(dividend.tds) : '');
  const [exDate, setExDate] = useState(dividend?.exDate || '');
  const [payDate, setPayDate] = useState(
    dividend?.payDate || toCalendarDate(new Date()),
  );
  const [notes, setNotes] = useState(dividend?.notes || '');

  // Reset the form when the dialog opens (render-phase state adjustment).
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
        setBrokerAccountId(initialBrokerAccountId || brokerAccounts[0]?.id || '');
        setInstrumentId(initialInstrumentId || '');
      }
    }
  }

  const brokerPositions = positions.filter((p) => !brokerAccountId || p.brokerAccountId === brokerAccountId);

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

    const res = isEdit && dividend
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

  const defaultTrigger = isEdit ? (
    <Button variant="ghost" size="sm">
      <Edit className="w-3.5 h-3.5 mr-1" />
      Edit
    </Button>
  ) : (
    <Button size="sm">
      <Plus className="w-4 h-4 mr-1.5" />
      Record Dividend
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Dividend' : 'Record Dividend / Payout'}</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {isEdit
              ? 'Update payout amount, dates, or tax deduction.'
              : 'Log received dividend, interest payout, or distribution.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Broker Account" required>
              <Select
                value={brokerAccountId}
                onValueChange={(val) => {
                  setBrokerAccountId(val);
                  setInstrumentId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select broker" />
                </SelectTrigger>
                <SelectContent>
                  {brokerAccounts.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Instrument" required>
              <Select value={instrumentId} onValueChange={setInstrumentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select instrument" />
                </SelectTrigger>
                <SelectContent>
                  {brokerPositions.map((p) => (
                    <SelectItem key={p.instrument.id} value={p.instrument.id}>
                      {p.instrument.name} ({p.instrument.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Payout Type" required>
              <Select value={type} onValueChange={(v) => setType(v as DividendType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dividend">Dividend</SelectItem>
                  <SelectItem value="interest">Interest</SelectItem>
                  <SelectItem value="capital_gain">Capital Gain Distribution</SelectItem>
                  <SelectItem value="other">Other Payout</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Net Amount Received" required>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Per Unit Amount">
              <input
                type="number"
                step="0.01"
                placeholder="Optional"
                value={perUnit}
                onChange={(e) => setPerUnit(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
              />
            </FormField>

            <FormField label="TDS Deducted">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={tds}
                onChange={(e) => setTds(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Ex-Date">
              <input
                type="date"
                value={exDate}
                onChange={(e) => setExDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </FormField>

            <FormField label="Payout / Credit Date" required>
              <input
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </FormField>
          </div>

          <FormField label="Notes">
            <input
              type="text"
              placeholder="e.g. Q4 Interim Dividend"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Record Payout')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
