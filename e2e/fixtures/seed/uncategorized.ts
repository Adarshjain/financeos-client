import type { ApiClient } from '../api';
import type { TransactionResponse } from './transactions';
import { createTransaction, todayString } from './transactions';

/**
 * A shop name the built-in engine cannot place, so rows under it arrive uncategorised. It ends in "Traders" (a business word)
 * so Sort them reads it as a shop, not as a person's name. Names are only unique within one user, which is all a spec needs.
 */
export function unknownShop(label: string): string {
  return `Zxqv ${label.charAt(0).toUpperCase()}${label.slice(1)} Traders`;
}

/** `count` debits of `amount` under one unknown shop name, one a day back from yesterday. */
export async function seedShopRows(
  api: ApiClient,
  accountId: string,
  shop: string,
  count: number,
  amount = -100
): Promise<TransactionResponse[]> {
  const rows: TransactionResponse[] = [];
  for (let i = 0; i < count; i++) {
    rows.push(await createTransaction(api, accountId, { amount: amount - i, date: todayString(-(i + 1)), description: shop }));
  }
  return rows;
}
