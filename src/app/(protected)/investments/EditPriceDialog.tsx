'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit3 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { toCalendarDate } from '@/lib/utils';

interface EditPriceDialogProps {
  instrument: {
    id: string;
    name: string;
    symbol?: string;
    lastPrice?: string;
    lastPriceAsOf?: string;
  };
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EditPriceDialog({
  instrument,
  trigger,
  onSuccess,
}: EditPriceDialogProps) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(instrument.lastPrice || '');
  const [asOf, setAsOf] = useState(
    instrument.lastPriceAsOf
      ? instrument.lastPriceAsOf.split('T')[0]
      : toCalendarDate(new Date())
  );
  const qc = useQueryClient();
  const setPriceMutation = useMutation({
    mutationFn: (body: { price: number; asOf?: string }) =>
      api.POST('/api/v1/instruments/{id}/price', {
        params: { path: { id: instrument.id } },
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const isSubmitting = setPriceMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || isNaN(Number(price))) {
      toast.error('Please enter a valid price.');
      return;
    }

    try {
      await setPriceMutation.mutateAsync({ price: Number(price), asOf });
      toast.success(`Price updated for ${instrument.name}`);
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.response.message
          : 'Failed to update price'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="micro"
            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
          >
            <Edit3 className="w-3 h-3 mr-1" />
            Edit Price
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Update Last Traded Price
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Set the manual market price for{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {instrument.name}
            </span>{' '}
            {instrument.symbol ? `(${instrument.symbol})` : ''}.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <form
            id="edit-price-form"
            onSubmit={handleSubmit}
            className="space-y-3 py-1"
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="price"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Price (INR)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ₹
                </span>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  required
                  className="pl-6 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="asOf"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                As of Date
              </Label>
              <Input
                id="asOf"
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </form>
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: isSubmitting ? 'Saving...' : 'Save Price',
            type: 'submit',
            form: 'edit-price-form',
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
