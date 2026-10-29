import type { Account, Cardholder } from '@/lib/account.types';
import { serverApi } from '@/lib/api/server';
import { cardholdersApi } from '@/lib/apiClient';
import { AccountType } from '@/lib/types';

import { buildCardsModel, type CardsModel, type HolderStats } from './cardsModel';

export interface CardsData {
  /** Null when the cardholders request failed: the tab shows an error instead of the cards. */
  cardholders: Cardholder[] | null;
  /** Null when the stats request failed: the cards show without their figures. */
  stats: HolderStats[] | null;
  /** Null when the cardholders request failed. */
  model: CardsModel | null;
}

async function loadStats(accountId: string): Promise<HolderStats[]> {
  const { data, error } = await serverApi.GET('/api/v1/accounts/{accountId}/cardholders/stats', {
    params: { path: { accountId } },
  });
  if (error) throw new Error("Couldn't load cardholder stats. Try again.");
  return (data as HolderStats[] | undefined) ?? [];
}

const ok = <T,>(r: PromiseSettledResult<T>): T | null => (r.status === 'fulfilled' ? r.value : null);

/** The cardholders and their stats, fetched in parallel (each degrades on its own), and the model the tab renders. */
export async function loadCardsData(account: Account, today: string): Promise<CardsData> {
  const [cardholdersResult, statsResult] = await Promise.allSettled([
    cardholdersApi.list(account.id),
    loadStats(account.id),
  ]);
  const cardholders = ok(cardholdersResult);
  const stats = ok(statsResult);
  const model = cardholders
    ? buildCardsModel({
        cardholders,
        stats,
        isBank: account.type === AccountType.BANK_ACCOUNT,
        creditCard: account.type === AccountType.CREDIT_CARD ? account : null,
        today,
      })
    : null;
  return { cardholders, stats, model };
}
