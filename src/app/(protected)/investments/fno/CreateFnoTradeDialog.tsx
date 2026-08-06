'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { createFnoTrade } from '@/actions/investments';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Broker } from '@/lib/account.types';
import { FnoContractType, OptionType } from '@/lib/types';

interface CreateFnoTradeDialogProps {
  brokerAccounts: Broker[];
  onSuccess?: () => void;
}

export function CreateFnoTradeDialog({ brokerAccounts, onSuccess }: CreateFnoTradeDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [brokerAccountId, setBrokerAccountId] = useState<string>('');
  const [tradingSymbol, setTradingSymbol] = useState('');
  const [underlyingSymbol, setUnderlyingSymbol] = useState('');
  const [contractType, setContractType] = useState<FnoContractType>('future');
  const [optionType, setOptionType] = useState<OptionType | ''>('');
  const [strikePrice, setStrikePrice] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyValue, setBuyValue] = useState('');
  const [sellValue, setSellValue] = useState('');
  const [totalCharges, setTotalCharges] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setBrokerAccountId(brokerAccounts[0]?.id || '');
    setTradingSymbol('');
    setUnderlyingSymbol('');
    setContractType('future');
    setOptionType('');
    setStrikePrice('');
    setExpiryDate('');
    setQuantity('');
    setBuyValue('');
    setSellValue('');
    setTotalCharges('');
    setEntryDate('');
    setExitDate('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!brokerAccountId) {
      toast.error('Please select a broker account');
      return;
    }
    if (!tradingSymbol.trim()) {
      toast.error('Trading symbol is required');
      return;
    }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      toast.error('Valid quantity is required');
      return;
    }
    if (buyValue === '' || isNaN(Number(buyValue))) {
      toast.error('Valid buy value is required');
      return;
    }
    if (sellValue === '' || isNaN(Number(sellValue))) {
      toast.error('Valid sell value is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createFnoTrade({
        brokerAccountId,
        tradingSymbol: tradingSymbol.trim().toUpperCase(),
        underlyingSymbol: underlyingSymbol.trim() ? underlyingSymbol.trim().toUpperCase() : undefined,
        contractType,
        optionType: contractType === 'option' && optionType ? (optionType as OptionType) : undefined,
        strikePrice: strikePrice ? Number(strikePrice) : undefined,
        expiryDate: expiryDate || undefined,
        quantity: Number(quantity),
        buyValue: Number(buyValue),
        sellValue: Number(sellValue),
        totalCharges: totalCharges ? Number(totalCharges) : 0,
        entryDate: entryDate || undefined,
        exitDate: exitDate || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        toast.success('FnO trade logged successfully');
        setOpen(false);
        resetForm();
        onSuccess?.();
      } else {
        toast.error(res.error?.message || 'Failed to log FnO trade');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (val && !brokerAccountId && brokerAccounts.length > 0) setBrokerAccountId(brokerAccounts[0].id); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold gap-1.5 shadow-sm">
          <Plus className="w-3.5 h-3.5" />
          Add F&O Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Log Futures & Options Trade</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Manually enter a completed F&O contract trade record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          {/* Broker Account */}
          <div className="space-y-1.5">
            <Label htmlFor="brokerAccount" className="text-xs font-semibold">Broker Account *</Label>
            <Select value={brokerAccountId} onValueChange={setBrokerAccountId}>
              <SelectTrigger id="brokerAccount" className="rounded-xl h-9 text-xs">
                <SelectValue placeholder="Select Broker" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {brokerAccounts.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.name} ({b.provider || b.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trading Symbol & Underlying */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tradingSymbol" className="text-xs font-semibold">Trading Symbol *</Label>
              <Input
                id="tradingSymbol"
                placeholder="e.g. NIFTY24AUG24500CE"
                value={tradingSymbol}
                onChange={(e) => setTradingSymbol(e.target.value)}
                className="rounded-xl h-9 text-xs uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="underlyingSymbol" className="text-xs font-semibold">Underlying Symbol</Label>
              <Input
                id="underlyingSymbol"
                placeholder="e.g. NIFTY / RELIANCE"
                value={underlyingSymbol}
                onChange={(e) => setUnderlyingSymbol(e.target.value)}
                className="rounded-xl h-9 text-xs uppercase"
              />
            </div>
          </div>

          {/* Contract Type & Option Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contractType" className="text-xs font-semibold">Contract Type</Label>
              <Select value={contractType} onValueChange={(v) => setContractType(v as FnoContractType)}>
                <SelectTrigger id="contractType" className="rounded-xl h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="future" className="text-xs">Futures (FUT)</SelectItem>
                  <SelectItem value="option" className="text-xs">Options (OPT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {contractType === 'option' && (
              <div className="space-y-1.5">
                <Label htmlFor="optionType" className="text-xs font-semibold">Option Type</Label>
                <Select value={optionType} onValueChange={(v) => setOptionType(v as OptionType)}>
                  <SelectTrigger id="optionType" className="rounded-xl h-9 text-xs">
                    <SelectValue placeholder="CE / PE" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="CE" className="text-xs">Call (CE)</SelectItem>
                    <SelectItem value="PE" className="text-xs">Put (PE)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Strike Price & Expiry Date */}
          {contractType === 'option' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="strikePrice" className="text-xs font-semibold">Strike Price</Label>
                <Input
                  id="strikePrice"
                  type="number"
                  step="any"
                  placeholder="e.g. 24500"
                  value={strikePrice}
                  onChange={(e) => setStrikePrice(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiryDate" className="text-xs font-semibold">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>
            </div>
          )}

          {/* Quantity, Buy Value, Sell Value */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quantity" className="text-xs font-semibold">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                placeholder="e.g. 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="buyValue" className="text-xs font-semibold">Buy Value (₹) *</Label>
              <Input
                id="buyValue"
                type="number"
                step="any"
                placeholder="e.g. 10000"
                value={buyValue}
                onChange={(e) => setBuyValue(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sellValue" className="text-xs font-semibold">Sell Value (₹) *</Label>
              <Input
                id="sellValue"
                type="number"
                step="any"
                placeholder="e.g. 12500"
                value={sellValue}
                onChange={(e) => setSellValue(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </div>

          {/* Charges, Entry Date, Exit Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="totalCharges" className="text-xs font-semibold">Total Charges (₹)</Label>
              <Input
                id="totalCharges"
                type="number"
                step="any"
                placeholder="e.g. 120"
                value={totalCharges}
                onChange={(e) => setTotalCharges(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entryDate" className="text-xs font-semibold">Entry Date</Label>
              <Input
                id="entryDate"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exitDate" className="text-xs font-semibold">Exit Date</Label>
              <Input
                id="exitDate"
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </div>

          {/* Calculated Realized P&L preview */}
          {buyValue !== '' && sellValue !== '' && !isNaN(Number(buyValue)) && !isNaN(Number(sellValue)) && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Estimated Realized P&L:</span>
              <span className={`text-xs font-bold ${
                Number(sellValue) - Number(buyValue) - (Number(totalCharges) || 0) >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                ₹{(Number(sellValue) - Number(buyValue) - (Number(totalCharges) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold">Notes</Label>
            <Input
              id="notes"
              placeholder="Optional trade commentary or strategy tag..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold"
            >
              {isSubmitting ? 'Saving...' : 'Save Trade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
