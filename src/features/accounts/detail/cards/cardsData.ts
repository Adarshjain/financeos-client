import type { Cardholder } from '@/lib/account.types';
import { serverApi } from '@/lib/api/server';
import { cardholdersApi } from '@/lib/apiClient';

import type { HolderStats } from './cardsModel';

export interface CardsData {
  /** Null when the cardholders request failed: the tab shows an error instead of the cards. */
  cardholders: Cardholder[] | null;
  /** Null when the stats request failed: the cards show without their figures. */
  stats: HolderStats[] | null;
}

async function loadStats(accountId: string): Promise<HolderStats[]> {
  const { data, error } = await serverApi.GET('/api/v1/accounts/{accountId}/cardholders/stats', {
    params: { path: { accountId } },
  });
  if (error) throw new Error('Could not load cardholder stats');
  return (data as HolderStats[] | undefined) ?? [];
}

const ok = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === 'fulfilled' ? r.value : null);

/** The cardholders and their stats, fetched in parallel; each degrades on its own. */
export async function loadCardsData(accountId: string): Promise<CardsData> {
  const [cardholders, stats] = await Promise.allSettled([
    cardholdersApi.list(accountId),
    loadStats(accountId),
  ]);
  return { cardholders: ok(cardholders), stats: ok(stats) };
}
