import { CorporateActionsSection } from '../CorporateActionsSection';
import { corporateActionsApi, instrumentsApi } from '@/lib/apiClient';
import { CorporateAction, Instrument } from '@/lib/types';

export default async function CorporateActionsPage() {
  const [corporateActionsData, instrumentsData] = await Promise.all([
    corporateActionsApi.listAll().catch(() => [] as CorporateAction[]),
    instrumentsApi.search().catch(() => [] as Instrument[]),
  ]);

  const corporateActions: CorporateAction[] = corporateActionsData || [];
  const instruments: Instrument[] = instrumentsData || [];

  return (
    <div className="pb-20 p-3 sm:p-6 space-y-4 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Corporate Actions ({corporateActions.length})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Stock splits, bonus issues, rights issues, and ticker adjustments
          </p>
        </div>
      </div>

      <CorporateActionsSection corporateActions={corporateActions} instruments={instruments} />
    </div>
  );
}
