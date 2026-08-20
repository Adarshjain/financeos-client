'use client';

import { Edit, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { createFnoTrade, updateFnoTrade } from '@/actions/investments';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Broker } from '@/lib/account.types';
import { FnoContractType, FnoTradeResponse, OptionType } from '@/lib/types';

export interface FnoTradeDialogProps {
  mode?: 'create' | 'edit';
  trade?: FnoTradeResponse;
  brokerAccounts: Broker[];
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function FnoTradeDialog({
  mode = 'create',
  trade,
  brokerAccounts,
  trigger,
  onSuccess,
}: FnoTradeDialogProps) {
  const isEdit = mode === 'edit' || !!trade;
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [brokerAccountId, setBrokerAccountId] = useState(
    trade?.brokerAccountId || brokerAccounts[0]?.id || '',
  );
  const [tradingSymbol, setTradingSymbol] = useState(trade?.tradingSymbol || '');
  const [underlyingSymbol, setUnderlyingSymbol] = useState(trade?.underlyingSymbol || '');
  const [contractType, setContractType] = useState<FnoContractType>(trade?.contractType || 'future');
  const [optionType, setOptionType] = useState<OptionType | ''>(trade?.optionType || '');
  const [strikePrice, setStrikePrice] = useState(trade?.strikePrice != null ? String(trade.strikePrice) : '');
  const [expiryDate, setExpiryDate] = useState(trade?.expiryDate || '');
  const [quantity, setQuantity] = useState(trade?.quantity ? String(trade.quantity) : '');
  const [buyValue, setBuyValue] = useState(trade?.buyValue != null ? String(trade.buyValue) : '');
  const [sellValue, setSellValue] = useState(trade?.sellValue != null ? String(trade.sellValue) : '');
  const [totalCharges, setTotalCharges] = useState(trade?.totalCharges != null ? String(trade.totalCharges) : '');
  const [entryDate, setEntryDate] = useState(trade?.entryDate || '');
  const [exitDate, setExitDate] = useState(trade?.exitDate || '');
  const [notes, setNotes] = useState(trade?.notes || '');

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && trade) {
      setBrokerAccountId(trade.brokerAccountId);
      setTradingSymbol(trade.tradingSymbol);
      setUnderlyingSymbol(trade.underlyingSymbol || '');
      setContractType(trade.contractType);
      setOptionType(trade.optionType || '');
      setStrikePrice(trade.strikePrice != null ? String(trade.strikePrice) : '');
      setExpiryDate(trade.expiryDate || '');
      setQuantity(String(trade.quantity));
      setBuyValue(String(trade.buyValue));
      setSellValue(trade.sellValue != null ? String(trade.sellValue) : '');
      setTotalCharges(trade.totalCharges != null ? String(trade.totalCharges) : '');
      setEntryDate(trade.entryDate || '');
      setExitDate(trade.exitDate || '');
      setNotes(trade.notes || '');
    }
  }

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
    const numQty = Number(quantity);
    if (!quantity || isNaN(numQty) || numQty <= 0) {
      toast.error('Valid quantity is required');
      return;
    }
    const numBuy = Number(buyValue);
    if (buyValue === '' || isNaN(numBuy)) {
      toast.error('Valid buy value is required');
      return;
    }

    setIsSubmitting(true);
    const req = {
      brokerAccountId,
      tradingSymbol: tradingSymbol.trim().toUpperCase(),
      underlyingSymbol: underlyingSymbol.trim().toUpperCase() || undefined,
      contractType,
      optionType: contractType === 'option' && optionType ? (optionType as OptionType) : undefined,
      strikePrice: strikePrice !== '' ? Number(strikePrice) : undefined,
      expiryDate: expiryDate || undefined,
      quantity: numQty,
      buyValue: numBuy,
      sellValue: sellValue !== '' ? Number(sellValue) : 0,
      totalCharges: totalCharges !== '' ? Number(totalCharges) : undefined,

      entryDate: entryDate || undefined,
      exitDate: exitDate || undefined,
      notes: notes.trim() || undefined,
    };

    const res = isEdit && trade
      ? await updateFnoTrade(trade.id, req)
      : await createFnoTrade(req);

    setIsSubmitting(false);

    if (res.success) {
      toast.success(isEdit ? 'FnO trade updated' : 'FnO trade recorded');
      setOpen(false);
      onSuccess?.();
    } else {
      toast.error(res.error.message);
    }
  };

  const defaultTrigger = isEdit ? (
    <Button variant="ghost" size="sm">
      <Edit className="w-3.5 h-3.5 mr-1" />
      Edit
    </Button>
  ) : (
    <Button size="sm">
      <Plus className="w-4 h-4 mr-1.5" />
      Add FnO Trade
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit FnO Trade' : 'Add FnO Trade'}</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {isEdit
              ? 'Update Futures or Options trade details.'
              : 'Record a new Futures or Options contract trade.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <form id="fno-trade-form" onSubmit={handleSubmit} className="space-y-3 pt-1">
            <FormField label="Broker Account" required>
              <Select value={brokerAccountId} onValueChange={setBrokerAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select broker" />
                </SelectTrigger>
                <SelectContent>
                  {brokerAccounts.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Contract Type" required>
                <Select value={contractType} onValueChange={(v) => setContractType(v as FnoContractType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="future">Futures</SelectItem>
                    <SelectItem value="option">Options</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Trading Symbol" required>
                <input
                  type="text"
                  required
                  placeholder="NIFTY24AUGFUT / NIFTY24250CE"
                  value={tradingSymbol}
                  onChange={(e) => setTradingSymbol(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono uppercase"
                />
              </FormField>
            </div>

            {contractType === 'option' && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Option Type">
                  <Select value={optionType} onValueChange={(v) => setOptionType(v as OptionType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="CE / PE" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call (CE)</SelectItem>
                      <SelectItem value="put">Put (PE)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Strike Price">
                  <input
                    type="number"
                    step="0.05"
                    placeholder="24250"
                    value={strikePrice}
                    onChange={(e) => setStrikePrice(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
                  />
                </FormField>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Quantity / Lot Size" required>
                <input
                  type="number"
                  required
                  placeholder="50"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
                />
              </FormField>

              <FormField label="Total Charges">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={totalCharges}
                  onChange={(e) => setTotalCharges(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Buy Value (₹)" required>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={buyValue}
                  onChange={(e) => setBuyValue(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
                />
              </FormField>

              <FormField label="Sell Value (₹)">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={sellValue}
                  onChange={(e) => setSellValue(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
                />
              </FormField>
            </div>
          </form>
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Record FnO Trade'),
            type: 'submit',
            form: 'fno-trade-form',
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
