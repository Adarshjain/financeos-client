'use client';

import { useInstruments } from '@/lib/query/hooks/useInvestments';

import { InstrumentsSection } from '../InstrumentsSection';

export function InstrumentsView() {
  const { data: instruments = [] } = useInstruments();

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Instruments ({instruments.length})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tracked stocks, ETFs, mutual funds, ISIN codes, and exchange tickers
          </p>
        </div>
      </div>

      <InstrumentsSection instruments={instruments} />
    </>
  );
}
