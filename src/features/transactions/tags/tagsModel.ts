import type { Account } from '@/lib/account.types';
import { formatCount } from '@/lib/format';
import type { Tag } from '@/lib/tags.types';
import type { Transaction, TransactionRequest } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

import { buildRequest, valuesFromTransaction } from '../form/transactionFormModel';

/** "3 transactions", for the line under the tag sheet's title. */
export const transactionsWord = (n: number) => formatCount(n, ['transaction', 'transactions']);

/** Whether two lists hold the same ids, in any order. */
export const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** "Added Goa trip to 3 transactions", "Added 2 tags to 1 transaction". */
export function bulkAddedMessage(tags: readonly Pick<Tag, 'name'>[], transactions: number): string {
  const what = tags.length === 1 ? tags[0].name : formatCount(tags.length, ['tag', 'tags']);
  return `Added ${what} to ${transactionsWord(transactions)}`;
}

/** The update request that changes only a transaction's tags: everything else is sent as the transaction already is. */
export function tagsRequest(t: Transaction, tagIds: string[], accounts: readonly Account[] | null): TransactionRequest {
  const account = accounts?.find((a) => a.id === t.accountId);
  const supportsCards = account ? account.type === AccountType.CREDIT_CARD || account.type === AccountType.BANK_ACCOUNT : Boolean(t.cardId);
  return buildRequest(valuesFromTransaction(t), { isUpdate: true, source: t.source, tagIds, category: null, supportsCards });
}
