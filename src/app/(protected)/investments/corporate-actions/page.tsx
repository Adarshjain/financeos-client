import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { corporateActionsApi, instrumentsApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';
import { CorporateAction, Instrument } from '@/lib/types';

import { CorporateActionsSection } from '../CorporateActionsSection';

export default async function CorporateActionsPage() {
  const qc = getQueryClient();
  const [corporateActionsData, instrumentsData] = await Promise.all([
    corporateActionsApi.listAll().catch(() => [] as CorporateAction[]),
    instrumentsApi.search().catch(() => [] as Instrument[]),
  ]);

  const corporateActions: CorporateAction[] = corporateActionsData || [];
  const instruments: Instrument[] = instrumentsData || [];
  qc.setQueryData(keys.investments.corporateActions(), corporateActions);
  qc.setQueryData(keys.investments.instruments(), instruments);

  return (
    <div className="pb-20 p-3 sm:p-6 space-y-2 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
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

      <HydrationBoundary state={dehydrate(qc)}>
        <CorporateActionsSection />
      </HydrationBoundary>
    </div>
  );
}
