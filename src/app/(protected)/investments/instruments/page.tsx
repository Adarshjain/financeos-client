import { CreateInstrumentDialog } from '../CreateInstrumentDialog';
import { InstrumentsSection } from '../InstrumentsSection';
import { instrumentsApi } from '@/lib/apiClient';
import { Instrument } from '@/lib/types';

export default async function InstrumentsPage() {
  const instrumentsData = await instrumentsApi.search().catch(() => [] as Instrument[]);
  const instruments: Instrument[] = instrumentsData || [];

  return (
    <div className="pb-20 p-3 sm:p-6 space-y-4 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Instruments Master Registry ({instruments.length})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tracked stocks, ETFs, mutual funds, ISIN codes, and exchange tickers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateInstrumentDialog />
        </div>
      </div>

      <InstrumentsSection instruments={instruments} />
    </div>
  );
}
