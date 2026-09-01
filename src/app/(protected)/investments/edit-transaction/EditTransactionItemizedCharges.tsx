'use client';

import { Label } from '@/components/ui/label';

interface EditTransactionItemizedChargesProps {
  brokerage: string | number;
  setBrokerage: (val: string) => void;
  stt: string | number;
  setStt: (val: string) => void;
  exchangeTxnCharges: string | number;
  setExchangeTxnCharges: (val: string) => void;
  sebiCharges: string | number;
  setSebiCharges: (val: string) => void;
  stampDuty: string | number;
  setStampDuty: (val: string) => void;
  gst: string | number;
  setGst: (val: string) => void;
  dpCharges: string | number;
  setDpCharges: (val: string) => void;
  otherCharges: string | number;
  setOtherCharges: (val: string) => void;
}

export function EditTransactionItemizedCharges({
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
}: EditTransactionItemizedChargesProps) {
  return (
    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
        Itemized Charges
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <Label className="text-2xs text-slate-500">Brokerage</Label>
          <input
            type="number"
            step="0.01"
            value={brokerage}
            onChange={(e) => setBrokerage(e.target.value)}
            className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          />
        </div>
        <div>
          <Label className="text-2xs text-slate-500">STT</Label>
          <input
            type="number"
            step="0.01"
            value={stt}
            onChange={(e) => setStt(e.target.value)}
            className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          />
        </div>
        <div>
          <Label className="text-2xs text-slate-500">Exch Txn</Label>
          <input
            type="number"
            step="0.01"
            value={exchangeTxnCharges}
            onChange={(e) => setExchangeTxnCharges(e.target.value)}
            className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          />
        </div>
        <div>
          <Label className="text-2xs text-slate-500">SEBI Fee</Label>
          <input
            type="number"
            step="0.01"
            value={sebiCharges}
            onChange={(e) => setSebiCharges(e.target.value)}
            className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          />
        </div>
        <div>
          <Label className="text-2xs text-slate-500">Stamp Duty</Label>
          <input
            type="number"
            step="0.01"
            value={stampDuty}
            onChange={(e) => setStampDuty(e.target.value)}
            className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          />
        </div>
        <div>
          <Label className="text-2xs text-slate-500">GST</Label>
          <input
            type="number"
            step="0.01"
            value={gst}
            onChange={(e) => setGst(e.target.value)}
            className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          />
        </div>
        <div>
          <Label className="text-2xs text-slate-500">DP Charges</Label>
          <input
            type="number"
            step="0.01"
            value={dpCharges}
            onChange={(e) => setDpCharges(e.target.value)}
            className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          />
        </div>
        <div>
          <Label className="text-2xs text-slate-500">Other</Label>
          <input
            type="number"
            step="0.01"
            value={otherCharges}
            onChange={(e) => setOtherCharges(e.target.value)}
            className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          />
        </div>
      </div>
    </div>
  );
}
