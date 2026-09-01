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
};

export type CreditCardRequest = AccountRequestBase & {
  type: AccountType.CREDIT_CARD;
  last4: string;
  creditLimit: number;
  /** Card membership anniversary (required) — anchors anniversary-year reward windows. */
  anniversaryDate: string;
  statementPassword?: string;
  replacesAccountId?: string | null;
  issuer?: string | null;
  productName?: string | null;
};

export type BrokerRequest = AccountRequestBase & {
  type: AccountType.BROKER;
  provider: string;
  clientId?: string;
  cashBalance?: number;
};

export type GenericAccountRequest = AccountRequestBase & {
  type: AccountType.GENERIC;
};

export type AccountRequest = BankAccountRequest | CreditCardRequest | BrokerRequest | GenericAccountRequest;

export interface CloseAccountRequest {
  closedOn?: string;
}

/**
 * Fields common to every account. Deliberately NOT a member of the `Account`
 * union and deliberately without a `type` field.
 */
export interface AccountBase {
  id: string;
  name: string;
  excludeFromNetAsset?: boolean;
  financialPosition?: FinancialPosition;
  description?: string;
  ingestFromDate?: string | null;
  closedOn?: string | null;
  warnings?: string[];
  balance?: number | null;
  balanceAnchored?: boolean | null;
  reconciliationGap?: number | null;
  anchorDate?: string | null;
}

export type AccountStatus = 'ACTIVE' | 'CLOSING' | 'CLOSED';

export function getAccountStatus(account: AccountBase, asOf: string = new Date().toISOString().slice(0, 10)): AccountStatus {
  if (!account.closedOn) return 'ACTIVE';
  return account.closedOn > asOf ? 'CLOSING' : 'CLOSED';
}

export function isAccountClosed(account: AccountBase, asOf?: string): boolean {
  return getAccountStatus(account, asOf) === 'CLOSED';
}

export function isAccountClosing(account: AccountBase, asOf?: string): boolean {
  return getAccountStatus(account, asOf) === 'CLOSING';
}

export type BankAccount = AccountBase & {
  type: AccountType.BANK_ACCOUNT;
  openingBalance?: string;
  last4?: string;
  lastStatementDate?: string | null;
  cardholders?: Cardholder[];
};

export type CardholderRole = 'PRIMARY' | 'ADDON';
export type CardholderRelationship = 'SELF' | 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'FRIEND' | 'OTHER';
export type CardRelationship = CardholderRelationship; // backward compat alias

export interface Card {
  id: string;
  accountId: string;
  cardholderId: string;
  last4: string;
  issuedOn: string;
  closedOn?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Cardholder {
  id: string;
  accountId: string;
  role: CardholderRole;
  personName?: string | null;
  relationship?: CardholderRelationship | null;
  spendLimit?: number | null;
  openedOn: string;
  closedOn?: string | null;
  effectiveClosedOn?: string | null;
  cards: Card[];
  currentLast4?: string | null;
  transactionCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Backward compatibility alias for UI components during transition
export type AccountCard = Cardholder;

/** True once a cardholder line has effectively ended — its own closure or its account's, whichever came first. */
export function isCardholderClosed(cardholder: Cardholder, asOf: string = new Date().toISOString().split('T')[0]): boolean {
  const effective = cardholder.effectiveClosedOn ?? cardholder.closedOn;
  return !!effective && effective <= asOf;
}

export function isCardLineClosed(cardholder: Cardholder, asOf?: string): boolean {
  return isCardholderClosed(cardholder, asOf);
}

export function accountHasActiveCard(account: CreditCard): boolean {
  if (account.closedOn && account.closedOn <= new Date().toISOString().split('T')[0]) {
    return false;
  }
  if (!account.cardholders || account.cardholders.length === 0) {
    return !account.closedOn;
  }
  return account.cardholders.some(ch => !isCardholderClosed(ch) && (ch.cards || []).some(c => !c.closedOn));
}

export interface CreateCardholderRequest {
  personName: string;
  relationship?: CardholderRelationship;
  spendLimit?: number | null;
  last4?: string;
  openedOn?: string;
  issuedOn?: string;
}

export interface UpdateCardholderRequest {
  personName?: string;
  relationship?: CardholderRelationship;
  spendLimit?: number | null;
}

export interface CreateCardRequest {
  last4: string;
  issuedOn?: string;
}

export interface ReplaceCardRequest {
  newLast4: string;
  issuedOn?: string;
}

export interface CloseCardholderRequest {
  closedOn?: string;
}

export interface CloseCardRequest {
  closedOn?: string;
}

// Legacy request types aliases
export type CreateAccountCardRequest = CreateCardholderRequest;
export type UpdateAccountCardRequest = UpdateCardholderRequest;
export type ReplaceCardInstanceRequest = ReplaceCardRequest;

export type CreditCard = AccountBase & {
  type: AccountType.CREDIT_CARD;
  last4: string;
  creditLimit: number;
  anniversaryDate?: string | null;
  lastStatementDate?: string | null;
  cardholders?: Cardholder[];
  replacesAccountId?: string | null;
  issuer?: string | null;
  productName?: string | null;
};

export type Broker = AccountBase & {
  type: AccountType.BROKER;
  provider?: string;
  clientId?: string;
  cashBalance?: number;
};

export type GenericAccount = AccountBase & {
  type: AccountType.GENERIC;
};

export type Account = BankAccount | CreditCard | Broker | GenericAccount;

/**
 * Type guard for filtering a mixed `Account[]` down to one variant.
 */
export function isAccountOfType<T extends AccountType>(type: T) {
  return (account: Account): account is Extract<Account, { type: T }> =>
    account.type === type;
}