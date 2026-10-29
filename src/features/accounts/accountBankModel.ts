import { AccountType } from '@/lib/types';

/** Bank accounts and credit cards belong to a bank; broker and generic (wallet) accounts do not. */
export function accountNeedsBank(type: AccountType): boolean {
  return type === AccountType.BANK_ACCOUNT || type === AccountType.CREDIT_CARD;
}
