'use client';

import { Plus, Repeat } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { createSip, updateSip } from '@/actions/investments';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Broker } from '@/lib/account.types';
import { Instrument, Position, Sip, SipFrequency } from '@/lib/types';
import { toCalendarDate } from '@/lib/utils';

import { InstrumentTypeahead } from './InstrumentTypeahead';

interface SipDialogProps {
  brokerAccounts: Broker[];
  positions?: Position[];
  sip?: Sip;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function SipDialog({
  brokerAccounts,
  sip,
  trigger,
  onSuccess,
}: SipDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!sip;

  const [brokerAccountId, setBrokerAccountId] = useState(
    sip?.brokerAccountId || brokerAccounts[0]?.id || ''
  );
  const [instrumentId, setInstrumentId] = useState(sip?.instrumentId || '');
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [amount, setAmount] = useState(sip?.amount ? String(sip.amount) : '');
  const [frequency, setFrequency] = useState<SipFrequency>(
    sip?.frequency || 'monthly'
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    sip?.dayOfMonth ? String(sip.dayOfMonth) : '5'
  );
  const [startDate, setStartDate] = useState(
    sip?.startDate ? sip.startDate.split('T')[0] : toCalendarDate(new Date())
  );
  const [endDate, setEndDate] = useState(
    sip?.endDate ? sip.endDate.split('T')[0] : ''
  );
  const [active, setActive] = useState<boolean>(
    sip?.active !== undefined ? sip.active : true
  );
  const [notes, setNotes] = useState(sip?.notes || '');

  const handleBrokerChange = (newBrokerId: string) => {
    setBrokerAccountId(newBrokerId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!brokerAccountId) {
      toast.error('Please select a broker account.');
      return;
    }
    if (!instrumentId) {
      toast.error('Please select an instrument.');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid installment amount.');
      return;
    }
    if (!startDate) {
      toast.error('Start date is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && sip) {
        const res = await updateSip(sip.id, {
          amount: Number(amount),
          frequency,
          dayOfMonth: frequency === 'monthly' ? Number(dayOfMonth) : undefined,
          startDate,
          endDate: endDate || undefined,
          active,
          notes: notes || undefined,
        });

        if (res.success) {
          toast.success(`Updated SIP for ${sip.instrumentName || 'Instrument'}`);
          setOpen(false);
          onSuccess?.();
        } else {
          toast.error(res.error.message);
        }
      } else {
        const res = await createSip({
          brokerAccountId,
          instrumentId,
          amount: Number(amount),
          frequency,
          dayOfMonth: frequency === 'monthly' ? Number(dayOfMonth) : undefined,
          startDate,
          endDate: endDate || undefined,
          active,
          notes: notes || undefined,
        });

        if (res.success) {
          toast.success(`Created ${frequency} SIP of ₹${amount}`);
          setOpen(false);
          setAmount('');
          setNotes('');
          onSuccess?.();
        } else {
          toast.error(res.error.message);
        }
      }
    } catch (err) {
      toast.error('Failed to save SIP: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1">
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            Set Up SIP
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Repeat className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            {isEditing ? 'Edit Systematic Investment Plan (SIP)' : 'Set Up New SIP'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Track automated recurring investments and monitor execution progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Broker Account
            </Label>
            {isEditing ? (
              <div className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                {sip?.brokerName || 'Broker'}
              </div>
            ) : (
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
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Target Instrument
            </Label>
            {isEditing ? (
              <div className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                {sip?.instrumentName || 'Instrument'}
                {sip?.symbol ? ` (${sip.symbol})` : ''}
              </div>
            ) : (
              <InstrumentTypeahead
                selectedInstrument={selectedInstrument}
                onSelect={(inst) => {
                  setSelectedInstrument(inst);
                  setInstrumentId(inst.id);
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Installment Amount (INR)"
              name="amount"
              type="number"
              step="1"
              min="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
              required
            />

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Frequency
              </Label>
              <Select value={frequency} onValueChange={(val) => setFrequency(val as SipFrequency)}>
                <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                  <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {frequency === 'monthly' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Preferred Day of Month (1-28)
              </Label>
              <Input
                type="number"
                min="1"
                max="28"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Start Date"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />

            <FormField
              label="End Date (Optional)"
              name="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id="sip-active"
              checked={active}
              onCheckedChange={(checked) => setActive(!!checked)}
            />
            <Label htmlFor="sip-active" className="text-xs cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
              SIP is Active (auto-evaluate installments)
            </Label>
          </div>

          <FormField
            label="Notes"
            name="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional reference / scheme code"
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
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update SIP' : 'Save SIP'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
