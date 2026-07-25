import { AccountType, FinancialPosition } from '@/lib/types';

export interface AccountRequestBase {
  name: string;
  excludeFromNetAsset?: boolean;
  financialPosition?: FinancialPosition;
  description?: string;
  ingestFromDate?: string | null;
}

export type BankAccountRequest = AccountRequestBase & {
  type: AccountType.BANK_ACCOUNT;
  openingBalance?: number;
  last4?: string;
  /**
   * Write-only. Verified against the running backend: the value is accepted on
   * create/update but never appears in any account response (list, single GET,
   * or the create response body), so it is deliberately absent from the
   * `BankAccount`/`CreditCard` response types. Declaring it there previously
   * implied the secret was served to the browser, and made the UI's
   * "password is set" indicators unreachable.
   *
   * Surfacing whether one is set would need a `hasStatementPassword` boolean
   * from the backend.
   */
  statementPassword?: string;
}

export type CreditCardRequest = AccountRequestBase & {
  type: AccountType.CREDIT_CARD;
  last4: string;
  creditLimit: number;
  paymentDueDay: number;
  gracePeriodDays: number;
  statementPassword?: string;
}

export type StockRequest = AccountRequestBase & {
  type: AccountType.STOCK;
  instrumentCode: string;
  lastTradedPrice?: string;
}

export type MutualFundRequest = AccountRequestBase & {
  type: AccountType.MUTUAL_FUND;
  instrumentCode: string;
  lastTradedPrice?: string;
}

export type GenericAccountRequest = AccountRequestBase & {
  type: AccountType.GENERIC;
}

export type AccountRequest = BankAccountRequest | CreditCardRequest | StockRequest | MutualFundRequest | GenericAccountRequest;


/**
 * Fields common to every account. Deliberately NOT a member of the `Account`
 * union and deliberately without a `type` field.
 *
 * It used to be both: `Account = AccountBase | BankAccount | ...` where
 * `AccountBase.type` was the whole `AccountType` enum. That made the union
 * undiscriminable — `AccountBase` structurally absorbed every variant and its
 * wide `type` meant `account.type === AccountType.CREDIT_CARD` narrowed
 * nothing. Call sites compensated with `as CreditCard[]` casts and
 * `'field' in account` probes, none of which the compiler could verify.
 */
interface AccountBase {
  id: string;
  name: string;
  excludeFromNetAsset?: boolean;
  financialPosition?: FinancialPosition;
  description?: string;
  ingestFromDate?: string | null;
  balance?: number | null;
  balanceAnchored?: boolean | null;
  reconciliationGap?: number | null;
  anchorDate?: string | null;
}

export type BankAccount = AccountBase & {
  type: AccountType.BANK_ACCOUNT;
  openingBalance?: string;
  last4?: string;
  lastStatementDate?: string | null;
}

export type CreditCard = AccountBase & {
  type: AccountType.CREDIT_CARD;
  last4: string;
  creditLimit: number;
  paymentDueDay: number;
  gracePeriodDays: number;
  lastStatementDate?: string | null;
}

export type Stock = AccountBase & {
  type: AccountType.STOCK;
  instrumentCode: string;
  lastTradedPrice?: string;
}

export type MutualFund = AccountBase & {
  type: AccountType.MUTUAL_FUND;
  instrumentCode: string;
  lastTradedPrice?: string;
}

export type GenericAccount = AccountBase & {
  type: AccountType.GENERIC;
}

export type Account = BankAccount | CreditCard | Stock | MutualFund | GenericAccount;

/**
 * Type guard for filtering a mixed `Account[]` down to one variant.
 *
 * `Array.prototype.filter` does not narrow from a plain boolean predicate, so
 * `accounts.filter(a => a.type === X)` still yields `Account[]` and previously
 * needed an unchecked `as BankAccount[]` cast. This restores the narrowing the
 * compiler can actually verify:
 *
 *   accounts.filter(isAccountOfType(AccountType.CREDIT_CARD)) // CreditCard[]
 */
export function isAccountOfType<T extends AccountType>(type: T) {
  return (account: Account): account is Extract<Account, { type: T }> =>
    account.type === type;
}