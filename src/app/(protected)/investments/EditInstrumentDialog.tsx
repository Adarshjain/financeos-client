'use client';

import { Edit } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { toastError } from '@/lib/toastError';
import { AssetClass, Instrument, InstrumentCandidate } from '@/lib/types';

import { EditInstrumentFields, type EditInstrumentValues } from './instrument-form/EditInstrumentFields';
import {
  assetClassSelection,
  AUTO_ASSET_CLASS,
  identifierClearError,
  type InstrumentFormErrors,
  instrumentFormErrors,
} from './instrument-form/instrumentEdit';
import { useUpdateInstrument } from './instrument-form/useInstrumentEdit';
import { InstrumentSearchField } from './InstrumentSearchField';

interface EditInstrumentDialogProps {
  instrument: Instrument;
  trigger?: React.ReactNode;
  /**
   * Called with the saved instrument. After an ISIN / AMFI code / Yahoo symbol
   * change its id is the instrument the user's holdings moved to — a view keyed
   * by the old id should follow it.
   */
  onUpdated?: (instrument: Instrument, previousId: string) => void;
}

const NO_ERRORS: InstrumentFormErrors = { fields: {}, form: null };

function valuesOf(instrument: Instrument): EditInstrumentValues {
  return {
    type: instrument.type || 'stock',
    name: instrument.name || '',
    symbol: instrument.symbol || '',
    exchange: instrument.exchange || '',
    isin: instrument.isin || '',
    amfiCode: instrument.amfiCode || '',
    yahooSymbol: instrument.yahooSymbol || '',
    currency: instrument.currency || 'INR',
    assetClass: assetClassSelection(instrument),
  };
}

export function EditInstrumentDialog({ instrument, trigger, onUpdated }: EditInstrumentDialogProps) {
  const [open, setOpen] = useState(false);
  const updateInstrumentMutation = useUpdateInstrument(instrument.id);
  const isSubmitting = updateInstrumentMutation.isPending;

  const [values, setValues] = useState<EditInstrumentValues>(() => valuesOf(instrument));
  const [errors, setErrors] = useState<InstrumentFormErrors>(NO_ERRORS);
  const onChange = (patch: Partial<EditInstrumentValues>) => setValues((v) => ({ ...v, ...patch }));

  // Reset the form from `instrument` whenever the dialog transitions to open.
  // Adjusted during render (React's documented alternative to an effect for
  // "reset state when a prop changes") rather than in a useEffect, so this
  // doesn't trigger a synchronous setState-in-effect cascade.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setValues(valuesOf(instrument));
      setErrors(NO_ERRORS);
    }
  }

  const handlePicked = (c: InstrumentCandidate) => {
    onChange({
      type: c.type,
      name: c.name,
      symbol: c.symbol || '',
      exchange: c.exchange || '',
      isin: c.isin || '',
      amfiCode: c.amfiCode || '',
      yahooSymbol: c.yahooSymbol || '',
      ...(c.currency ? { currency: c.currency } : {}),
    });
    toast.success(`Filled from “${c.name}” — review and save`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) {
      setErrors({ fields: { name: 'Name is required' }, form: null });
      return;
    }
    const clearError = identifierClearError(instrument, values);
    if (clearError) {
      setErrors({ fields: { [clearError.field]: clearError.message }, form: null });
      return;
    }
    setErrors(NO_ERRORS);

    const initialAssetClass = assetClassSelection(instrument);
    const assetClass =
      values.assetClass === initialAssetClass
        ? undefined
        : values.assetClass === AUTO_ASSET_CLASS
          ? null
          : (values.assetClass as AssetClass);

    try {
      const { instrument: updated, moved, merged, mergeNote } = await updateInstrumentMutation.mutateAsync({
        body: {
          type: values.type,
          name: values.name.trim(),
          symbol: values.symbol.trim() || undefined,
          exchange: values.exchange.trim() || undefined,
          isin: values.isin.trim() || undefined,
          amfiCode: values.amfiCode.trim() || undefined,
          yahooSymbol: values.yahooSymbol.trim() || undefined,
          currency: values.currency.trim() || undefined,
        },
        assetClass,
      });

      if (merged) {
        toast.success(`Merged your holding into your existing ${updated.name} holding`, {
          description: mergeNote ?? undefined,
        });
      } else {
        toast.success(
          moved ? `Moved your holdings to ${updated.name}` : `Updated ${updated.name} for your account`
        );
      }
      setOpen(false);
      onUpdated?.(updated, instrument.id);
    } catch (err) {
      const inline = instrumentFormErrors(err);
      if (inline) {
        setErrors(inline);
      } else {
        toastError(err, 'Failed to update instrument');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Edit Instrument</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Edits apply to your account only. Changing the ISIN, AMFI code or Yahoo symbol moves your
            holdings, trades and prices to the instrument with that identifier — not possible while
            either instrument is part of a corporate action.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          <div className="space-y-2 py-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Search catalog to auto-fill
            </Label>
            <InstrumentSearchField
              type={values.type}
              onPick={handlePicked}
              placeholder="Search AMFI / Yahoo to fix or fill identifiers…"
            />
          </div>

          <form
            id="edit-instrument-form"
            onSubmit={handleSubmit}
            noValidate
            className="space-y-3 py-1 border-t border-slate-100 dark:border-slate-800"
          >
            <EditInstrumentFields values={values} onChange={onChange} errors={errors.fields} />
            {errors.form && (
              <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                {errors.form}
              </p>
            )}
          </form>
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: isSubmitting ? 'Saving...' : 'Save Changes',
            type: 'submit',
            form: 'edit-instrument-form',
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
