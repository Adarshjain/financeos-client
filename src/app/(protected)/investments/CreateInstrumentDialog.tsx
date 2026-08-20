'use client';

import { ChevronDown, ChevronRight, Info, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { createInstrument } from '@/actions/investments';
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
import { Instrument, InstrumentType } from '@/lib/types';

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

  const searchFirst = initialMode !== 'manual';
  const [manualOpen, setManualOpen] = useState(!searchFirst);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState<InstrumentType>(defaultType ?? 'stock');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [exchange, setExchange] = useState('NSE');
  const [isin, setIsin] = useState('');
  const [amfiCode, setAmfiCode] = useState('');
  const [yahooSymbol, setYahooSymbol] = useState('');
  const [userEditedYahoo, setUserEditedYahoo] = useState(false);
  const [currency, setCurrency] = useState('INR');

  useEffect(() => {
    if (open) {
      setManualOpen(!searchFirst);
    }
  }, [open, searchFirst]);

  const resetForm = () => {
    setName('');
    setSymbol('');
    setIsin('');
    setAmfiCode('');
    setYahooSymbol('');
    setUserEditedYahoo(false);
  };

  const handleResolved = (instrument: Instrument) => {
    onCreated?.(instrument);
    setOpen(false);
  };

  const handleSymbolChange = (val: string) => {
    setSymbol(val);
    if ((type === 'stock' || type === 'etf') && !userEditedYahoo) {
      setYahooSymbol(val.trim() ? `${val.trim().toUpperCase()}.NS` : '');
    }
  };

  const handleYahooChange = (val: string) => {
    setYahooSymbol(val);
    setUserEditedYahoo(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Instrument name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createInstrument({
        type,
        name: name.trim(),
        symbol: symbol.trim() || undefined,
        exchange: exchange.trim() || undefined,
        isin: isin.trim() || undefined,
        amfiCode: amfiCode.trim() || undefined,
        yahooSymbol: yahooSymbol.trim() || undefined,
        currency: currency.trim() || undefined,
      });

      if (res.success) {
        toast.success(`Created instrument ${res.data.name}`);
        setOpen(false);
        resetForm();
        onCreated?.(res.data);
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to create instrument: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <DialogTitle className="text-base font-bold">Add Instrument</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Search the live AMFI / Yahoo catalog and pick — prices are wired automatically. Can’t
            find it? Enter details manually.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          {searchFirst && (
            <div className="space-y-2 py-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Search catalog
              </Label>
              <InstrumentSearchField type={defaultType} autoFocus onResolved={handleResolved} />
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
            <>
              {/* Auto-pricing Readiness Helper */}
              <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  Auto-pricing Requirements
                </div>
                <div className="text-2xs text-slate-600 dark:text-slate-400 space-y-0.5 pl-4">
                  <div>• <span className="font-semibold text-slate-800 dark:text-slate-200">Stocks / ETFs</span> require a <span className="font-semibold">Yahoo Symbol</span> (defaults to <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-2xs">SYMBOL.NS</code>).</div>
                  <div>• <span className="font-semibold text-slate-800 dark:text-slate-200">Mutual Funds</span> require an <span className="font-semibold">AMFI Code</span> (6 digits).</div>
                </div>
              </div>

              <form id="create-instrument-form" onSubmit={handleSubmit} className="space-y-3 py-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Type</Label>
                    <Select
                      value={type}
                      onValueChange={(val) => {
                        const newType = val as InstrumentType;
                        setType(newType);
                        if ((newType === 'stock' || newType === 'etf') && symbol && !userEditedYahoo) {
                          setYahooSymbol(`${symbol.trim().toUpperCase()}.NS`);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                        <SelectItem value="stock" className="text-xs">Stock</SelectItem>
                        <SelectItem value="mutual_fund" className="text-xs">Mutual Fund</SelectItem>
                        <SelectItem value="etf" className="text-xs">ETF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <FormField
                    label="Exchange"
                    name="exchange"
                    type="text"
                    value={exchange}
                    onChange={(e) => setExchange(e.target.value)}
                    placeholder="e.g. NSE, BSE"
                  />
                </div>

                <FormField
                  label="Instrument Name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Reliance Industries Ltd"
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="Symbol / Ticker"
                    name="symbol"
                    type="text"
                    value={symbol}
                    onChange={(e) => handleSymbolChange(e.target.value)}
                    placeholder="e.g. RELIANCE"
                  />

                  <FormField
                    label="Currency"
                    name="currency"
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    placeholder="INR"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="ISIN (Optional)"
                    name="isin"
                    type="text"
                    value={isin}
                    onChange={(e) => setIsin(e.target.value)}
                    placeholder="INE002A01018"
                  />

                  <FormField
                    label="AMFI Code (For Mutual Funds)"
                    name="amfiCode"
                    type="text"
                    value={amfiCode}
                    onChange={(e) => setAmfiCode(e.target.value)}
                    placeholder="e.g. 120503"
                  />
                </div>

                <FormField
                  label="Yahoo Symbol (For Stocks/ETFs)"
                  name="yahooSymbol"
                  type="text"
                  value={yahooSymbol}
                  onChange={(e) => handleYahooChange(e.target.value)}
                  placeholder="e.g. RELIANCE.NS"
                />
              </form>
            </>
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
