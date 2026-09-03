'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
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
import { api, ApiError } from '@/lib/api/client';
import { UpdateDividendRequest } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import { Dividend, DividendType } from '@/lib/types';

interface EditDividendDialogProps {
  dividend: Dividend;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EditDividendDialog({
  dividend,
  trigger,
  onSuccess,
}: EditDividendDialogProps) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () =>
      api.DELETE('/api/v1/investments/dividends/{id}', {
        params: { path: { id: dividend.id } },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const updateMutation = useMutation({
    mutationFn: (body: UpdateDividendRequest) =>
      api
        .PUT('/api/v1/investments/dividends/{id}', {
          params: { path: { id: dividend.id } },
          body,
        })
        .then((r) => r.data! as Dividend),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const isDeleting = deleteMutation.isPending;
  const isSubmitting = updateMutation.isPending;

  const [type, setType] = useState<DividendType>(dividend.type);
  const [amount, setAmount] = useState(dividend.amount);
  const [perUnit, setPerUnit] = useState(dividend.perUnit || '');
  const [tds, setTds] = useState(dividend.tds || '');
  const [exDate, setExDate] = useState(dividend.exDate?.split('T')[0] || '');
  const [payDate, setPayDate] = useState(dividend.payDate?.split('T')[0] || '');
  const [notes, setNotes] = useState(dividend.notes || '');

  const handleDelete = async () => {
    if (
      !confirm('Are you sure you want to delete this dividend payout record?')
    )
      return;
    try {
      await deleteMutation.mutateAsync();
      toast.success('Dividend deleted');
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.response.message
          : 'Failed to delete dividend'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateMutation.mutateAsync({
        type,
        amount: Number(amount),
        perUnit: perUnit ? Number(perUnit) : undefined,
        tds: tds ? Number(tds) : undefined,
        exDate: exDate || undefined,
        payDate,
        notes: notes || undefined,
      });

      toast.success('Dividend updated');
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.response.message
          : 'Failed to update dividend'
      );
    }
  };

  const instrumentName = dividend.instrumentName || 'Instrument';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="icon-xs"
            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Edit Payout ({instrumentName})
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Modify dividend / income payout details for {instrumentName}.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <form
            id="edit-dividend-form"
            onSubmit={handleSubmit}
            className="space-y-3 py-1"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Broker Account
                </Label>
                <div className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                  {dividend.brokerName || 'Broker'}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Instrument
                </Label>
                <div className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                  {dividend.instrumentName || 'Instrument'}
                  {dividend.symbol ? ` (${dividend.symbol})` : ''}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Type
                </Label>
                <Select
                  value={type}
                  onValueChange={(val) => setType(val as DividendType)}
                >
                  <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                    <SelectItem value="dividend" className="text-xs">
                      Dividend
                    </SelectItem>
                    <SelectItem value="interest" className="text-xs">
                      Interest
                    </SelectItem>
                    <SelectItem value="other" className="text-xs">
                      Other Payout
                    </SelectItem>
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
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Per Unit Amount"
                name="perUnit"
                type="number"
                step="0.0001"
                min="0"
                value={perUnit}
                onChange={(e) => setPerUnit(e.target.value)}
              />

              <FormField
                label="Ex-Date"
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
              placeholder="Optional notes"
            />

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                {isDeleting ? 'Deleting...' : 'Delete Payout'}
              </Button>
            </div>
          </form>
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: isSubmitting ? 'Saving...' : 'Save Changes',
            type: 'submit',
            form: 'edit-dividend-form',
            disabled: isSubmitting,
          }}
          secondaryAction={{
            label: 'Cancel',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
