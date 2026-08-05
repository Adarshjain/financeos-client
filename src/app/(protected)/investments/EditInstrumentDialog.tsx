'use client';

import { Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { updateInstrument } from '@/actions/investments';
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
import { Instrument, InstrumentCandidate, InstrumentType } from '@/lib/types';

import { InstrumentSearchField } from './InstrumentSearchField';

interface EditInstrumentDialogProps {
  instrument: Instrument;
  trigger?: React.ReactNode;
}

export function EditInstrumentDialog({ instrument, trigger }: EditInstrumentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [type, setType] = useState<InstrumentType>(instrument.type || 'stock');
  const [name, setName] = useState(instrument.name || '');
  const [symbol, setSymbol] = useState(instrument.symbol || '');
  const [exchange, setExchange] = useState(instrument.exchange || '');
  const [isin, setIsin] = useState(instrument.isin || '');
  const [amfiCode, setAmfiCode] = useState(instrument.amfiCode || '');
  const [yahooSymbol, setYahooSymbol] = useState(instrument.yahooSymbol || '');
  const [currency, setCurrency] = useState(instrument.currency || 'INR');

  useEffect(() => {
    if (open) {
      setType(instrument.type || 'stock');
      setName(instrument.name || '');
      setSymbol(instrument.symbol || '');
      setExchange(instrument.exchange || '');
      setIsin(instrument.isin || '');
      setAmfiCode(instrument.amfiCode || '');
      setYahooSymbol(instrument.yahooSymbol || '');
      setCurrency(instrument.currency || 'INR');
    }
  }, [open, instrument]);

  // Search-fill: pick a live AMFI/Yahoo candidate to overwrite this instrument's identifiers
  // (name/symbol/exchange/isin/amfiCode/yahooSymbol) so pricing wires up. The instrument keeps
  // its id + holdings — nothing is persisted until the user reviews and clicks Save.
  const handlePicked = (c: InstrumentCandidate) => {
    setType(c.type);
    setName(c.name);
    setSymbol(c.symbol || '');
    setExchange(c.exchange || '');
    setIsin(c.isin || '');
    setAmfiCode(c.amfiCode || '');
    setYahooSymbol(c.yahooSymbol || '');
    if (c.currency) setCurrency(c.currency);
    toast.success(`Filled from “${c.name}” — review and save`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Instrument name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateInstrument(instrument.id, {
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
        toast.success(`Updated instrument ${res.data.name}`);
        setOpen(false);
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to update instrument: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
            <Edit className="w-3.5 h-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Edit Instrument</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Search the live AMFI / Yahoo catalog to auto-fill pricing identifiers, or edit the
            fields below by hand. Saving keeps this instrument and its holdings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Search catalog to auto-fill
          </Label>
          <InstrumentSearchField
            type={type}
            onPick={handlePicked}
            placeholder="Search AMFI / Yahoo to fix or fill identifiers…"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-2 py-2 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Type</Label>
              <Select
                value={type}
                onValueChange={(val) => setType(val as InstrumentType)}
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
              onChange={(e) => setSymbol(e.target.value)}
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
            onChange={(e) => setYahooSymbol(e.target.value)}
            placeholder="e.g. RELIANCE.NS"
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
