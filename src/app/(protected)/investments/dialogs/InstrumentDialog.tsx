'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Plus } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { CreateInstrumentRequest, Instrument, InstrumentType } from '@/lib/types';

import { InstrumentSearchField } from '../InstrumentSearchField';

export interface InstrumentDialogProps {
  mode?: 'create' | 'edit';
  instrument?: Instrument;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (instrument: Instrument) => void;
  onUpdated?: (instrument: Instrument) => void;
  initialMode?: 'search' | 'manual';
  type?: InstrumentType;
}

export function InstrumentDialog({
  mode = 'create',
  instrument,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onCreated,
  onUpdated,
  initialMode = 'search',
  type: defaultType,
}: InstrumentDialogProps) {
  const isEdit = mode === 'edit' || !!instrument;
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (val: boolean) => {
    if (isControlled) {
      setControlledOpen?.(val);
    } else {
      setInternalOpen(val);
    }
  };

  const searchFirst = !isEdit && initialMode !== 'manual';
  const [, setManualOpen] = useState(isEdit || !searchFirst);
  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (body: CreateInstrumentRequest) =>
      api.POST('/api/v1/instruments', { body }).then((r) => r.data! as Instrument),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const updateMutation = useMutation({
    mutationFn: (body: CreateInstrumentRequest) =>
      api
        .PUT('/api/v1/instruments/{id}', {
          params: { path: { id: instrument?.id ?? '' } },
          body,
        })
        .then((r) => r.data! as Instrument),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const [type, setType] = useState<InstrumentType>(instrument?.type ?? defaultType ?? 'stock');
  const [name, setName] = useState(instrument?.name ?? '');
  const [symbol, setSymbol] = useState(instrument?.symbol ?? '');
  const [exchange, setExchange] = useState(instrument?.exchange ?? 'NSE');
  const [isin, setIsin] = useState(instrument?.isin ?? '');
  const [amfiCode, setAmfiCode] = useState(instrument?.amfiCode ?? '');
  const [yahooSymbol, setYahooSymbol] = useState(instrument?.yahooSymbol ?? '');
  const [, setUserEditedYahoo] = useState(false);
  const [currency, setCurrency] = useState(instrument?.currency ?? 'INR');

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      if (instrument) {
        setType(instrument.type);
        setName(instrument.name);
        setSymbol(instrument.symbol || '');
        setExchange(instrument.exchange || 'NSE');
        setIsin(instrument.isin || '');
        setAmfiCode(instrument.amfiCode || '');
        setYahooSymbol(instrument.yahooSymbol || '');
        setCurrency(instrument.currency || 'INR');
        setManualOpen(true);
      } else {
        setManualOpen(!searchFirst);
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) {
      toast.error('Name and symbol are required.');
      return;
    }

    const req: CreateInstrumentRequest = {
      type,
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      exchange: exchange.trim().toUpperCase() || undefined,
      isin: isin.trim().toUpperCase() || undefined,
      amfiCode: amfiCode.trim() || undefined,
      yahooSymbol: yahooSymbol.trim() || undefined,
      currency: currency.trim().toUpperCase() || 'INR',
    };

    try {
      const saved =
        isEdit && instrument ? await updateMutation.mutateAsync(req) : await createMutation.mutateAsync(req);

      toast.success(isEdit ? 'Instrument updated' : 'Instrument created');
      setOpen(false);
      if (isEdit) {
        onUpdated?.(saved);
      } else {
        onCreated?.(saved);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.response.message : 'Failed to save instrument');
    }
  };

  const defaultTrigger = isEdit ? (
    <Button variant="outline" size="sm">
      <Edit className="mr-2 h-3.5 w-3.5" />
      Edit Instrument
    </Button>
  ) : (
    <Button size="sm">
      <Plus className="mr-2 h-4 w-4" />
      Add Instrument
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Instrument' : 'Add Instrument'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update instrument details and price tracking configuration.'
              : 'Search for an existing instrument candidate or create a new custom instrument.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {!isEdit && searchFirst && (
            <div className="space-y-3 pb-2">
              <Label className="text-xs text-slate-500 font-medium">Quick Search Instrument</Label>
              <InstrumentSearchField
                onResolved={(inst) => {
                  toast.info(`Selected ${inst.name} (${inst.symbol})`);
                  onCreated?.(inst);
                  setOpen(false);
                }}
              />
            </div>
          )}

          <form id="instrument-dialog-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <FormField label="Instrument Type" required>
                <Select value={type} onValueChange={(v) => setType(v as InstrumentType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock / Equity</SelectItem>
                    <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                    <SelectItem value="etf">ETF</SelectItem>
                    <SelectItem value="bond">Bond / Govt Security</SelectItem>
                    <SelectItem value="reit">REIT / InvIT</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Name" required>
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  placeholder="e.g. Reliance Industries"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Symbol" required>
                  <input
                    type="text"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm uppercase"
                    placeholder="e.g. RELIANCE"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                  />
                </FormField>

                <FormField label="Exchange">
                  <input
                    type="text"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm uppercase"
                    placeholder="NSE, BSE, NASDAQ"
                    value={exchange}
                    onChange={(e) => setExchange(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="ISIN">
                  <input
                    type="text"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm uppercase"
                    placeholder="INE002A01018"
                    value={isin}
                    onChange={(e) => setIsin(e.target.value)}
                  />
                </FormField>

                <FormField label="Yahoo Symbol">
                  <input
                    type="text"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    placeholder="RELIANCE.NS"
                    value={yahooSymbol}
                    onChange={(e) => {
                      setYahooSymbol(e.target.value);
                      setUserEditedYahoo(true);
                    }}
                  />
                </FormField>
              </div>
            </div>
          </form>
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: isSubmitting
              ? isEdit
                ? 'Saving...'
                : 'Creating...'
              : isEdit
                ? 'Save Changes'
                : 'Create Instrument',
            type: 'submit',
            form: 'instrument-dialog-form',
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
