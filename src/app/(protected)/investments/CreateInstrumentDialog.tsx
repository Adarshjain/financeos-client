'use client';

import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';

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
import { Instrument, InstrumentType } from '@/lib/types';

import { ManualInstrumentFormFields } from './instrument-form/ManualInstrumentFormFields';
import { useCreateInstrumentDialog } from './instrument-form/useCreateInstrumentDialog';
import { InstrumentSearchField } from './InstrumentSearchField';

interface CreateInstrumentDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (instrument: Instrument) => void;
  initialMode?: 'search' | 'manual';
  type?: InstrumentType;
}

export function CreateInstrumentDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onCreated,
  initialMode = 'search',
  type: defaultType,
}: CreateInstrumentDialogProps) {
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

  const {
    searchFirst,
    manualOpen,
    setManualOpen,
    isSubmitting,
    type,
    name,
    setName,
    symbol,
    exchange,
    setExchange,
    isin,
    setIsin,
    amfiCode,
    setAmfiCode,
    yahooSymbol,
    currency,
    setCurrency,
    handleResolved,
    handleSymbolChange,
    handleTypeChange,
    handleYahooChange,
    handleSubmit,
  } = useCreateInstrumentDialog({
    open,
    setOpen,
    onCreated,
    initialMode,
    defaultType,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="w-3.5 h-3.5" />
            Add Instrument
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Add Instrument
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Search the live AMFI / Yahoo catalog and pick — prices are wired
            automatically. Can’t find it? Enter details manually.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          {searchFirst && (
            <div className="space-y-2 py-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Search catalog
              </Label>
              <InstrumentSearchField
                type={defaultType}
                autoFocus
                onResolved={handleResolved}
              />
            </div>
          )}

          {searchFirst && (
            <button
              type="button"
              onClick={() => setManualOpen((v) => !v)}
              className="w-full flex items-center gap-1.5 px-1 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 border-t border-slate-100 dark:border-slate-800 transition-colors"
            >
              {manualOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              Enter manually (advanced)
            </button>
          )}

          {manualOpen && (
            <ManualInstrumentFormFields
              type={type}
              onTypeChange={handleTypeChange}
              exchange={exchange}
              setExchange={setExchange}
              name={name}
              setName={setName}
              symbol={symbol}
              onSymbolChange={handleSymbolChange}
              currency={currency}
              setCurrency={setCurrency}
              isin={isin}
              setIsin={setIsin}
              amfiCode={amfiCode}
              setAmfiCode={setAmfiCode}
              yahooSymbol={yahooSymbol}
              onYahooChange={handleYahooChange}
              onSubmit={handleSubmit}
            />
          )}
        </DialogBody>

        <DialogFooter
          primaryAction={
            manualOpen
              ? {
                  label: isSubmitting ? 'Creating...' : 'Create Instrument',
                  type: 'submit',
                  form: 'create-instrument-form',
                  disabled: isSubmitting,
                }
              : {
                  label: 'Cancel',
                  variant: 'outline',
                  onClick: () => setOpen(false),
                }
          }
          secondaryAction={manualOpen ? { label: 'Cancel' } : undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
