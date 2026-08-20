'use client';

import { Edit3 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { setInstrumentPrice } from '@/actions/investments';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export function EditPriceDialog({ instrument, trigger, onSuccess }: EditPriceDialogProps) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(instrument.lastPrice || '');
  const [asOf, setAsOf] = useState(
    instrument.lastPriceAsOf
      ? instrument.lastPriceAsOf.split('T')[0]
      : toCalendarDate(new Date())
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || isNaN(Number(price))) {
      toast.error('Please enter a valid price.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await setInstrumentPrice(instrument.id, {
        price: Number(price),
        asOf,
      });

      if (res.success) {
        toast.success(`Price updated for ${instrument.name}`);
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to update price: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="micro" className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40">
            <Edit3 className="w-3 h-3 mr-1" />
            Edit Price
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Update Last Traded Price</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Set the manual market price for <span className="font-semibold text-slate-700 dark:text-slate-300">{instrument.name}</span> {instrument.symbol ? `(${instrument.symbol})` : ''}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-2 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="price" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Price (INR)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
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
            <Label htmlFor="asOf" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Price'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
