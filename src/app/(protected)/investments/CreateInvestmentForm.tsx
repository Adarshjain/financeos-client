'use client';

import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp, Plus, Receipt, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { createInvestmentTransaction } from '@/actions/investments';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Instrument, InvestmentTransactionType } from '@/lib/types';
import { formatMoney, toCalendarDate } from '@/lib/utils';

import { InstrumentTypeahead } from './InstrumentTypeahead';

interface CreateInvestmentFormProps {
  brokerAccounts: Broker[];
  initialBrokerAccountId?: string;
  initialInstrument?: Instrument | null;
  onSuccess?: () => void;
}

export function CreateInvestmentForm({
  brokerAccounts,
  initialBrokerAccountId,
  initialInstrument,
  onSuccess,
}: CreateInvestmentFormProps) {
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>(
    initialBrokerAccountId || brokerAccounts[0]?.id || '',
  );
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(
    initialInstrument || null,
  );
  const [type, setType] = useState<InvestmentTransactionType>('buy');

  const [showCharges, setShowCharges] = useState(false);
  const [brokerage, setBrokerage] = useState('');
  const [stt, setStt] = useState('');
  const [exchangeTxnCharges, setExchangeTxnCharges] = useState('');
  const [sebiCharges, setSebiCharges] = useState('');
  const [stampDuty, setStampDuty] = useState('');
  const [gst, setGst] = useState('');
  const [dpCharges, setDpCharges] = useState('');
  const [otherCharges, setOtherCharges] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const totalCharges = useMemo(() => {
    const b = parseFloat(brokerage) || 0;
    const s = parseFloat(stt) || 0;
    const e = parseFloat(exchangeTxnCharges) || 0;
    const sb = parseFloat(sebiCharges) || 0;
    const sd = parseFloat(stampDuty) || 0;
    const g = parseFloat(gst) || 0;
    const dp = parseFloat(dpCharges) || 0;
    const o = parseFloat(otherCharges) || 0;
    return b + s + e + sb + sd + g + dp + o;
  }, [brokerage, stt, exchangeTxnCharges, sebiCharges, stampDuty, gst, dpCharges, otherCharges]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBrokerId) {
      toast.error('Please select a broker account');
      return;
    }
    if (!selectedInstrument) {
      toast.error('Please select an instrument');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const quantityStr = formData.get('quantity') as string;
    const priceStr = formData.get('price') as string;
    const tradeDate = formData.get('tradeDate') as string;
    const notes = formData.get('notes') as string;

    const quantity = parseFloat(quantityStr);
    const price = parseFloat(priceStr);

    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (isNaN(price) || price < 0) {
      toast.error('Price cannot be negative');
      return;
    }
    if (!tradeDate) {
      toast.error('Trade date is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await createInvestmentTransaction(null, {
        brokerAccountId: selectedBrokerId,
        instrumentId: selectedInstrument.id,
        type,
        quantity,
        price,
        tradeDate,
        charges: {
          brokerage: parseFloat(brokerage) || 0,
          stt: parseFloat(stt) || 0,
          exchangeTxnCharges: parseFloat(exchangeTxnCharges) || 0,
          sebiCharges: parseFloat(sebiCharges) || 0,
          stampDuty: parseFloat(stampDuty) || 0,
          gst: parseFloat(gst) || 0,
          dpCharges: parseFloat(dpCharges) || 0,
          otherCharges: parseFloat(otherCharges) || 0,
        },
        notes: notes || undefined,
      });

      if (res.success) {
        toast.success(`Recorded ${type.toUpperCase()} trade for ${selectedInstrument.name}`);
        // Reset form state
        setSelectedInstrument(null);
        setType('buy');
        setBrokerage('');
        setStt('');
        setExchangeTxnCharges('');
        setSebiCharges('');
        setStampDuty('');
        setGst('');
        setDpCharges('');
        setOtherCharges('');
        setShowCharges(false);
        setFormKey((k) => k + 1);
        onSuccess?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to record trade: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [quantityInput, setQuantityInput] = useState('');
  const [priceInput, setPriceInput] = useState('');

  const estGrossValue = useMemo(() => {
    const q = parseFloat(quantityInput) || 0;
    const p = parseFloat(priceInput) || 0;
    return q * p;
  }, [quantityInput, priceInput]);

  const estNetTotal = useMemo(() => {
    if (type === 'buy') {
      return estGrossValue + totalCharges;
    }
    return Math.max(0, estGrossValue - totalCharges);
  }, [type, estGrossValue, totalCharges]);

  if (brokerAccounts.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Record Trade
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6 text-xs text-slate-500 space-y-3">
          <p>You need at least one broker account to record trades.</p>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link href="/accounts">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Broker Account
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-md rounded-xl overflow-hidden transition-all">
      {/* Order Ticket Header Banner */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            {type === 'buy' ? <ArrowDownLeft className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <ArrowUpRight className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                {type.toUpperCase()} ORDER
              </span>
              {selectedInstrument && (
                <span className="text-xs font-bold bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                  {selectedInstrument.exchange || 'NSE'}
                </span>
              )}
            </div>
            <h2 className="text-sm font-extrabold mt-0.5 text-slate-900 dark:text-slate-100 truncate max-w-[220px]">
              {selectedInstrument ? selectedInstrument.name : 'Select Instrument'}
            </h2>
          </div>
        </div>
        <div className="text-right pr-10">
          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Est. Order Total</div>
          <div className="text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">{formatMoney(estNetTotal)}</div>
        </div>
      </div>

      <CardContent className="p-4 sm:p-5 space-y-2">
        <form key={formKey} onSubmit={handleSubmit} className="space-y-2">
          {/* Order Side Segmented Switch */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setType('buy')}
              className={`py-2 px-3 text-xs font-black rounded-md transition-all flex items-center justify-center gap-1.5 ${
                type === 'buy'
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              BUY
            </button>
            <button
              type="button"
              onClick={() => setType('sell')}
              className={`py-2 px-3 text-xs font-black rounded-md transition-all flex items-center justify-center gap-1.5 ${
                type === 'sell'
                  ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              SELL
            </button>
          </div>

          {/* Broker Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Broker Account</Label>
            <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
              <SelectTrigger className="w-full bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-semibold h-9 rounded-lg">
                <SelectValue placeholder="Select broker account..." />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                {brokerAccounts.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs font-medium">
                    {b.name} ({b.provider || 'Broker'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Instrument Typeahead */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Instrument Master</Label>
            <InstrumentTypeahead
              selectedInstrument={selectedInstrument}
              onSelect={(inst) => setSelectedInstrument(inst)}
            />
          </div>

          {/* Quantity & Price Inputs with Live Calculation */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trade-quantity" className="text-xs font-bold text-slate-700 dark:text-slate-300">Quantity</Label>
              <Input
                id="trade-quantity"
                name="quantity"
                type="number"
                step="0.0001"
                min="0"
                placeholder="0"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                required
                className="bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-bold h-9 rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="trade-price" className="text-xs font-bold text-slate-700 dark:text-slate-300">Price per Unit (₹)</Label>
              <Input
                id="trade-price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                required
                className="bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-bold h-9 rounded-lg"
              />
            </div>
          </div>

          {/* Live Order Summary Card */}
          {estGrossValue > 0 && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Order Contract Value</span>
                <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatMoney(estGrossValue)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Est. Charges</span>
                <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-400">+{formatMoney(totalCharges)}</span>
              </div>
              <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-black">
                <span className="text-slate-900 dark:text-white">Net Cashflow</span>
                <span className={type === 'buy' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                  {type === 'buy' ? '-' : '+'}{formatMoney(estNetTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Trade Date */}
          <FormField
            label="Execution Date"
            name="tradeDate"
            type="date"
            defaultValue={toCalendarDate(new Date())}
            required
          />

          {/* Itemized Charges Collapsible (Zerodha Style Breakdown) */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowCharges((prev) => !prev)}
              className="w-full px-3.5 py-2.5 text-xs font-bold flex items-center justify-between text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-400" />
                <span>Zerodha Itemized Charges</span>
                {totalCharges > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {formatMoney(totalCharges)}
                  </Badge>
                )}
              </div>
              {showCharges ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showCharges && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2.5 text-xs bg-white dark:bg-slate-900">
                <div className="space-y-1">
                  <Label htmlFor="charge-brokerage" className="text-[10px] text-slate-500 font-bold uppercase">Brokerage</Label>
                  <Input
                    id="charge-brokerage"
                    type="number"
                    name="brokerage"
                    step="0.01"
                    value={brokerage}
                    onChange={(e) => setBrokerage(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="charge-stt" className="text-[10px] text-slate-500 font-bold uppercase">STT / CTT</Label>
                  <Input
                    id="charge-stt"
                    type="number"
                    name="stt"
                    step="0.01"
                    value={stt}
                    onChange={(e) => setStt(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="charge-exchangeTxnCharges" className="text-[10px] text-slate-500 font-bold uppercase">Exch Txn Fee</Label>
                  <Input
                    id="charge-exchangeTxnCharges"
                    type="number"
                    name="exchangeTxnCharges"
                    step="0.01"
                    value={exchangeTxnCharges}
                    onChange={(e) => setExchangeTxnCharges(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="charge-sebiCharges" className="text-[10px] text-slate-500 font-bold uppercase">SEBI Fee</Label>
                  <Input
                    id="charge-sebiCharges"
                    type="number"
                    name="sebiCharges"
                    step="0.01"
                    value={sebiCharges}
                    onChange={(e) => setSebiCharges(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="charge-stampDuty" className="text-[10px] text-slate-500 font-bold uppercase">Stamp Duty</Label>
                  <Input
                    id="charge-stampDuty"
                    type="number"
                    name="stampDuty"
                    step="0.01"
                    value={stampDuty}
                    onChange={(e) => setStampDuty(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="charge-gst" className="text-[10px] text-slate-500 font-bold uppercase">GST (18%)</Label>
                  <Input
                    id="charge-gst"
                    type="number"
                    name="gst"
                    step="0.01"
                    value={gst}
                    onChange={(e) => setGst(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="charge-dpCharges" className="text-[10px] text-slate-500 font-bold uppercase">DP Charges</Label>
                  <Input
                    id="charge-dpCharges"
                    type="number"
                    name="dpCharges"
                    step="0.01"
                    value={dpCharges}
                    onChange={(e) => setDpCharges(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="charge-otherCharges" className="text-[10px] text-slate-500 font-bold uppercase">Other Charges</Label>
                  <Input
                    id="charge-otherCharges"
                    type="number"
                    name="otherCharges"
                    step="0.01"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <FormField
            label="Order Notes (Optional)"
            name="notes"
            type="text"
            placeholder="e.g. Zerodha Tradebook import / Manual Buy"
          />

          <div className="pt-2">
            <SubmitButton
              className={`w-full font-black text-xs h-10 rounded-lg shadow-sm transition-all text-white ${
                type === 'buy'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              }`}
              pending={isSubmitting}
            >
              {type === 'buy' ? 'EXECUTE BUY ORDER' : 'EXECUTE SELL ORDER'}
              {estNetTotal > 0 ? ` • ${formatMoney(estNetTotal)}` : ''}
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
