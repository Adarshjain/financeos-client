'use client';

import { ChevronDown, ChevronUp, Receipt } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/utils';

interface ItemizedChargesCollapsibleProps {
  showCharges: boolean;
  setShowCharges: (show: boolean | ((prev: boolean) => boolean)) => void;
  totalCharges: number;
  brokerage: string;
  setBrokerage: (b: string) => void;
  stt: string;
  setStt: (s: string) => void;
  exchangeTxnCharges: string;
  setExchangeTxnCharges: (e: string) => void;
  sebiCharges: string;
  setSebiCharges: (s: string) => void;
  stampDuty: string;
  setStampDuty: (s: string) => void;
  gst: string;
  setGst: (g: string) => void;
  dpCharges: string;
  setDpCharges: (d: string) => void;
  otherCharges: string;
  setOtherCharges: (o: string) => void;
}

export function ItemizedChargesCollapsible({
  showCharges,
  setShowCharges,
  totalCharges,
  brokerage,
  setBrokerage,
  stt,
  setStt,
  exchangeTxnCharges,
  setExchangeTxnCharges,
  sebiCharges,
  setSebiCharges,
  stampDuty,
  setStampDuty,
  gst,
  setGst,
  dpCharges,
  setDpCharges,
  otherCharges,
  setOtherCharges,
}: ItemizedChargesCollapsibleProps) {
  return (
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
            <Badge
              variant="secondary"
              className="text-2xs font-mono px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              {formatMoney(totalCharges)}
            </Badge>
          )}
        </div>
        {showCharges ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {showCharges && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2.5 text-xs bg-white dark:bg-slate-900">
          <div className="space-y-1">
            <Label
              htmlFor="charge-brokerage"
              className="text-2xs text-slate-500 font-bold uppercase"
            >
              Brokerage
            </Label>
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
            <Label
              htmlFor="charge-stt"
              className="text-2xs text-slate-500 font-bold uppercase"
            >
              STT / CTT
            </Label>
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
            <Label
              htmlFor="charge-exchangeTxnCharges"
              className="text-2xs text-slate-500 font-bold uppercase"
            >
              Exch Txn Fee
            </Label>
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
            <Label
              htmlFor="charge-sebiCharges"
              className="text-2xs text-slate-500 font-bold uppercase"
            >
              SEBI Fee
            </Label>
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
            <Label
              htmlFor="charge-stampDuty"
              className="text-2xs text-slate-500 font-bold uppercase"
            >
              Stamp Duty
            </Label>
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
            <Label
              htmlFor="charge-gst"
              className="text-2xs text-slate-500 font-bold uppercase"
            >
              GST (18%)
            </Label>
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
            <Label
              htmlFor="charge-dpCharges"
              className="text-2xs text-slate-500 font-bold uppercase"
            >
              DP Charges
            </Label>
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
            <Label
              htmlFor="charge-otherCharges"
              className="text-2xs text-slate-500 font-bold uppercase"
            >
              Other Charges
            </Label>
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
  );
}
