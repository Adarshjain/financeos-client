import { needsCardLast6 } from '@/features/banks/banks';
import {
  type Account,
  type AccountRequest,
  type CardholderRelationship,
  type CreditLimitPool,
  getIngestFromDate,
  supportsIngestion,
} from '@/lib/account.types';
import { formatCount } from '@/lib/format';
import { AccountType, type FinancialPosition } from '@/lib/types';

export const LIMIT_POOL_NONE = 'none';
export const LIMIT_POOL_NEW = 'new';

export const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: AccountType.BANK_ACCOUNT, label: 'Bank' },
  { value: AccountType.CREDIT_CARD, label: 'Credit card' },
  { value: AccountType.BROKER, label: 'Broker' },
  { value: AccountType.GENERIC, label: 'Wallet / cash' },
];

export const FINANCIAL_POSITION_OPTIONS: { value: FinancialPosition; label: string }[] = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
];

export const BROKER_PROVIDERS = [
  'Zerodha',
  'Groww',
  'SBI MF',
  'Upstox',
  'Angel One',
  'ICICI Direct',
  'HDFC Securities',
  'Kuvera',
  'Coin',
  'Paytm Money',
];

export function accountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? 'Account';
}

/** The type slug ("bank_account"…), or null for anything else. */
export function parseAddType(param: string | null | undefined): AccountType | null {
  return ACCOUNT_TYPE_OPTIONS.find((o) => o.value === param)?.value ?? null;
}

/** A card is a liability; everything else starts as an asset. */
export function defaultFinancialPosition(type: AccountType): FinancialPosition {
  return type === AccountType.CREDIT_CARD ? 'liability' : 'asset';
}

export type AddonRelationship = Exclude<CardholderRelationship, 'SELF'>;

/** An add-on card of a new credit card; `relationship` is '' until one is picked. */
export interface AddonCardValue {
  last4: string;
  relationship: AddonRelationship | '';
  holderName: string;
}

/** A closed earlier number of the primary card (prefilled, never typed in by hand). */
export interface EarlierCardValue {
  last4: string;
  closedOn: string;
}

export interface AccountFormValues {
  type: AccountType | null;
  name: string;
  description: string;
  bank: string;
  provider: string;
  clientId: string;
  cashBalance: string;
  openingBalance: string;
  last4: string;
  last6: string;
  anniversaryDate: string;
  statementPassword: string;
  limitPoolChoice: string;
  limitPoolName: string;
  limitPoolLimit: string;
  creditLimit: string;
  financialPosition: FinancialPosition;
  ingestFromDate: string;
  identifiers: string[];
  excludeFromNetAsset: boolean;
  /** Create only: credit card add-ons. */
  addonCards: AddonCardValue[];
  /** Create only: closed earlier numbers of the primary card. */
  earlierCards: EarlierCardValue[];
  /** Create only: the bank account's debit card last 4 (optional). */
  debitCardLast4: string;
}

type CardListKey = 'addonCards' | 'earlierCards';

export type FieldKey = Exclude<keyof AccountFormValues, 'type' | CardListKey>;

const FIELDS_BY_TYPE: Record<AccountType, readonly FieldKey[]> = {
  [AccountType.BANK_ACCOUNT]: [
    'name',
    'description',
    'bank',
    'openingBalance',
    'last4',
    'statementPassword',
    'ingestFromDate',
    'identifiers',
    'financialPosition',
    'excludeFromNetAsset',
  ],
  [AccountType.CREDIT_CARD]: [
    'name',
    'description',
    'bank',
    'last4',
    'last6',
    'anniversaryDate',
    'statementPassword',
    'limitPoolChoice',
    'limitPoolName',
    'limitPoolLimit',
    'creditLimit',
    'ingestFromDate',
    'identifiers',
    'financialPosition',
    'excludeFromNetAsset',
  ],
  [AccountType.BROKER]: [
    'name',
    'description',
    'provider',
    'clientId',
    'cashBalance',
    'financialPosition',
    'excludeFromNetAsset',
  ],
  [AccountType.GENERIC]: ['name', 'description', 'financialPosition', 'excludeFromNetAsset'],
};

/** The fields a type shows; limit pool name/amount only appear once a shared limit is picked. */
export function fieldsFor(type: AccountType | null, limitPoolChoice: string = LIMIT_POOL_NONE): FieldKey[] {
  if (!type) return [];
  const pooled = limitPoolChoice !== LIMIT_POOL_NONE;
  return FIELDS_BY_TYPE[type].filter(
    (f) => pooled || (f !== 'limitPoolName' && f !== 'limitPoolLimit')
  );
}

/** A by-hand account starts importing Gmail from this many days back (the field can be cleared or set earlier). */
export const DEFAULT_GMAIL_HISTORY_DAYS = 30;

/** The default "Import emails from" for a new hand-made account: the business date minus 30 days (yyyy-mm-dd). */
export function defaultIngestFromDate(today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - DEFAULT_GMAIL_HISTORY_DAYS)).toISOString().slice(0, 10);
}

export function emptyValues(type: AccountType | null): AccountFormValues {
  return {
    type,
    name: '',
    description: '',
    bank: '',
    provider: '',
    clientId: '',
    cashBalance: '',
    openingBalance: '',
    last4: '',
    last6: '',
    anniversaryDate: '',
    statementPassword: '',
    limitPoolChoice: LIMIT_POOL_NONE,
    limitPoolName: '',
    limitPoolLimit: '',
    creditLimit: '',
    financialPosition: type ? defaultFinancialPosition(type) : 'asset',
    ingestFromDate: '',
    identifiers: [],
    excludeFromNetAsset: false,
    addonCards: [],
    earlierCards: [],
    debitCardLast4: '',
  };
}

const str = (v: string | number | null | undefined) => (v === null || v === undefined ? '' : String(v));

/** The form's starting values for an account being edited. Identifiers load separately. */
export function valuesFromAccount(account: Account): AccountFormValues {
  const base: AccountFormValues = {
    ...emptyValues(account.type),
    name: account.name,
    description: account.description ?? '',
    financialPosition: account.financialPosition ?? 'asset',
    excludeFromNetAsset: account.excludeFromNetAsset ?? false,
  };
  switch (account.type) {
    case AccountType.BANK_ACCOUNT:
      return {
        ...base,
        bank: account.bank ?? '',
        openingBalance: str(account.openingBalance),
        last4: account.last4 ?? '',
        ingestFromDate: account.ingestFromDate?.split('T')[0] ?? '',
      };
    case AccountType.CREDIT_CARD:
      return {
        ...base,
        bank: account.bank ?? '',
        last4: account.last4 ?? '',
        last6: account.last6 ?? (needsCardLast6(account.bank ?? '') ? (account.last4 ?? '') : ''),
        anniversaryDate: account.anniversaryDate ?? '',
        creditLimit: str(account.creditLimit),
        limitPoolChoice: account.limitPool ? account.limitPool.id : LIMIT_POOL_NONE,
        limitPoolName: account.limitPool?.name ?? '',
        limitPoolLimit: str(account.limitPool?.creditLimit),
        ingestFromDate: account.ingestFromDate?.split('T')[0] ?? '',
      };
    case AccountType.BROKER:
      return {
        ...base,
        provider: account.provider ?? '',
        clientId: account.clientId ?? '',
        cashBalance: str(account.cashBalance ?? 0),
      };
    default:
      return base;
  }
}

/** Switching the picked shared limit refills name and amount from that pool (blank for a new one). */
export function withLimitPoolChoice(
  values: AccountFormValues,
  choice: string,
  pools: readonly CreditLimitPool[]
): AccountFormValues {
  const pool = pools.find((p) => p.id === choice);
  return {
    ...values,
    limitPoolChoice: choice,
    limitPoolName: pool?.name ?? '',
    limitPoolLimit: pool ? String(pool.creditLimit) : '',
  };
}

/** Other accounts that share the picked pool, leaving out the one being edited. */
export function otherPoolMembers(
  pools: readonly CreditLimitPool[],
  choice: string,
  currentPoolId?: string | null
): number {
  const pool = pools.find((p) => p.id === choice);
  if (!pool) return 0;
  return pool.memberCount - (pool.id === currentPoolId ? 1 : 0);
}

export function otherPoolMembersNote(others: number): string {
  return `Changing the name or amount also changes it for the ${formatCount(others, ['other account', 'other accounts'])} sharing this limit.`;
}

/** Money as typed: blank is undefined, commas are ignored, anything else non-numeric is NaN. */
export function parseAmount(raw: string): number | undefined {
  const trimmed = raw.replaceAll(',', '').trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Errors of one card row; rows without a problem are empty objects, so indexes line up with the values. */
export interface CardRowErrors {
  last4?: string;
  relationship?: string;
}

export type FormErrors = Partial<Record<FieldKey, string>> & Partial<Record<CardListKey, CardRowErrors[]>>;

const FOUR_DIGITS = /^\d{4}$/;

/** The primary card's last 4: typed, or the end of the 6 digits for a bank that needs them. */
export function cardLast4Of(values: Pick<AccountFormValues, 'bank' | 'last4' | 'last6'>): string {
  return needsCardLast6(values.bank) ? values.last6.trim().slice(-4) : values.last4.trim();
}

/** Credit card: the last-6 input starts with the known last 4 when the bank needs 6 digits. */
export function withLast6Seed(values: AccountFormValues): AccountFormValues {
  if (values.type !== AccountType.CREDIT_CARD || !needsCardLast6(values.bank) || values.last6 !== '') return values;
  return { ...values, last6: values.last4 };
}

/** Credit card: switching bank moves the digits between the last-4 and last-6 inputs. */
export function withBankSwitch(values: AccountFormValues, bank: string): AccountFormValues {
  const next = { ...values, bank };
  if (values.type !== AccountType.CREDIT_CARD) return next;
  const was = needsCardLast6(values.bank);
  const now = needsCardLast6(bank);
  if (now && !was) return withLast6Seed(next);
  if (was && !now && values.last6.length >= 4) return { ...next, last4: values.last6.slice(-4) };
  return next;
}
const SIX_DIGITS = /^\d{6}$/;
const INVALID_AMOUNT = 'Enter a valid amount.';
export const DUPLICATE_LAST4 = 'This number is already listed above.';

/** Checks each card row's last 4 (and relationship) and flags a number that repeats one before it. */
function cardRowErrors(
  rows: readonly { last4: string; relationship?: string }[],
  taken: Set<string>,
  needsRelationship: boolean
): CardRowErrors[] | undefined {
  const result = rows.map((row): CardRowErrors => {
    const last4 = row.last4.trim();
    const error: CardRowErrors = {};
    if (!FOUR_DIGITS.test(last4)) error.last4 = 'Enter the last 4 digits.';
    else if (taken.has(last4)) error.last4 = DUPLICATE_LAST4;
    else taken.add(last4);
    if (needsRelationship && !row.relationship) error.relationship = 'Pick who the holder is.';
    return error;
  });
  return result.some((e) => e.last4 || e.relationship) ? result : undefined;
}

export function validateAccountForm(values: AccountFormValues): FormErrors {
  const { type } = values;
  const errors: FormErrors = {};
  if (!type) return errors;
  const fields = new Set(fieldsFor(type, values.limitPoolChoice));

  if (!values.name.trim()) errors.name = 'Enter a name.';

  const checkOptionalAmount = (key: 'openingBalance' | 'cashBalance') => {
    if (fields.has(key) && Number.isNaN(parseAmount(values[key]))) errors[key] = INVALID_AMOUNT;
  };
  checkOptionalAmount('openingBalance');
  checkOptionalAmount('cashBalance');

  if (fields.has('bank') && !values.bank) errors.bank = 'Select a bank.';

  if (type === AccountType.BANK_ACCOUNT) {
    const last4 = values.last4.trim();
    if (last4 && !FOUR_DIGITS.test(last4)) errors.last4 = 'Enter the last 4 digits.';
    const debit = values.debitCardLast4.trim();
    if (debit && !FOUR_DIGITS.test(debit)) errors.debitCardLast4 = 'Enter the last 4 digits.';
    const earlier = cardRowErrors(values.earlierCards, new Set(FOUR_DIGITS.test(debit) ? [debit] : []), false);
    if (earlier) errors.earlierCards = earlier;
  }

  if (type === AccountType.CREDIT_CARD) {
    const cardLast4 = cardLast4Of(values);
    if (needsCardLast6(values.bank)) {
      const last6 = values.last6.trim();
      if (!SIX_DIGITS.test(last6)) errors.last6 = 'Enter the last 6 digits of the card.';
    } else if (!FOUR_DIGITS.test(cardLast4)) {
      errors.last4 = 'Enter the last 4 digits of the card.';
    }
    const taken = new Set<string>(FOUR_DIGITS.test(cardLast4) ? [cardLast4] : []);
    const earlier = cardRowErrors(values.earlierCards, taken, false);
    if (earlier) errors.earlierCards = earlier;
    const addons = cardRowErrors(values.addonCards, taken, true);
    if (addons) errors.addonCards = addons;
    if (!values.anniversaryDate) errors.anniversaryDate = 'Enter the card anniversary.';
    const pooled = values.limitPoolChoice !== LIMIT_POOL_NONE;
    if (!pooled) {
      const own = parseAmount(values.creditLimit);
      if (Number.isNaN(own)) errors.creditLimit = INVALID_AMOUNT;
      else if (own === undefined) errors.creditLimit = 'Enter a credit limit.';
    }
    if (pooled) {
      const name = values.limitPoolName.trim();
      if (!name) errors.limitPoolName = 'Enter a name.';
      else if (name.length > 150) errors.limitPoolName = 'Use 150 characters or fewer.';
      const amount = parseAmount(values.limitPoolLimit);
      if (amount === undefined || Number.isNaN(amount) || amount <= 0) {
        errors.limitPoolLimit = 'Enter an amount above ₹0';
      }
    }
  }

  if (type === AccountType.BROKER && !values.provider.trim()) errors.provider = 'Enter a provider.';

  return errors;
}

const earlierCardsBody = (rows: readonly EarlierCardValue[]) =>
  rows.map((c) => ({ last4: c.last4.trim(), ...(c.closedOn ? { closedOn: c.closedOn } : {}) }));

/** The create/update body for the picked type. Call only when `validateAccountForm` is clean. */
export function buildAccountRequest(values: AccountFormValues): AccountRequest {
  const type = values.type;
  if (!type) throw new Error('Account type is required');
  const common = {
    name: values.name.trim(),
    excludeFromNetAsset: values.excludeFromNetAsset,
    financialPosition: values.financialPosition,
    description: values.description.trim(),
  };
  const ingestFromDate = values.ingestFromDate.trim() || null;
  const password = values.statementPassword ? { statementPassword: values.statementPassword } : {};

  switch (type) {
    case AccountType.BANK_ACCOUNT:
      return {
        ...common,
        type,
        bank: values.bank,
        ingestFromDate,
        last4: values.last4.trim(),
        openingBalance: parseAmount(values.openingBalance),
        ...(values.debitCardLast4.trim() ? { debitCard: { last4: values.debitCardLast4.trim() } } : {}),
        ...(values.earlierCards.length > 0 ? { earlierCards: earlierCardsBody(values.earlierCards) } : {}),
        ...password,
      };
    case AccountType.CREDIT_CARD: {
      const pooled = values.limitPoolChoice !== LIMIT_POOL_NONE;
      return {
        ...common,
        type,
        bank: values.bank,
        ingestFromDate,
        last4: cardLast4Of(values),
        ...(needsCardLast6(values.bank) && values.last6.trim() ? { last6: values.last6.trim() } : {}),
        creditLimit: pooled ? null : (parseAmount(values.creditLimit) ?? null),
        limitPool: pooled
          ? {
              id: values.limitPoolChoice === LIMIT_POOL_NEW ? null : values.limitPoolChoice,
              name: values.limitPoolName.trim(),
              creditLimit: parseAmount(values.limitPoolLimit),
            }
          : null,
        anniversaryDate: values.anniversaryDate,
        ...(values.addonCards.length > 0
          ? {
              addonCards: values.addonCards.map((c) => ({
                last4: c.last4.trim(),
                relationship: c.relationship as AddonRelationship,
                ...(c.holderName.trim() ? { holderName: c.holderName.trim() } : {}),
              })),
            }
          : {}),
        ...(values.earlierCards.length > 0 ? { earlierCards: earlierCardsBody(values.earlierCards) } : {}),
        ...password,
      };
    }
    case AccountType.BROKER:
      return {
        ...common,
        type,
        provider: values.provider.trim(),
        clientId: values.clientId.trim() || undefined,
        cashBalance: parseAmount(values.cashBalance) ?? 0,
      };
    default:
      return { ...common, type };
  }
}

/** True when saving moves "Import emails from" later, which orphans Gmail alerts before the new date. */
export function movesIngestLater(account: Account, nextIso: string): boolean {
  const current = getIngestFromDate(account);
  if (!supportsIngestion(account.type) || !current || !nextIso) return false;
  return nextIso > current.split('T')[0];
}

export const IDENTIFIER_LENGTH_ERROR = 'Identifiers are 2 to 32 characters.';

export type IdentifierAdd = { ok: true; list: string[] } | { ok: false; error: string };

/** Adds a typed identifier: spaces removed, 2 to 32 characters, no repeats. */
export function addIdentifier(list: readonly string[], raw: string): IdentifierAdd {
  const clean = raw.trim().replaceAll(/\s+/g, '');
  if (clean.length < 2 || clean.length > 32) return { ok: false, error: IDENTIFIER_LENGTH_ERROR };
  if (list.includes(clean)) return { ok: false, error: `${clean} is already added.` };
  return { ok: true, list: [...list, clean] };
}

/** What saving changes against the identifiers already stored on the account. */
export function diffIdentifiers(
  stored: readonly { id: string; value: string }[],
  next: readonly string[]
): { add: string[]; remove: { id: string; value: string }[] } {
  return {
    add: next.filter((v) => !stored.some((s) => s.value === v)),
    remove: stored.filter((s) => !next.includes(s.value)),
  };
}

export function identifiersFailedMessage(failed: readonly string[], created: boolean): string {
  return created
    ? `Account created, but these identifiers couldn't be added: ${failed.join(', ')}. Add them again from Edit account.`
    : `Saved, but these identifiers couldn't be updated: ${failed.join(', ')}.`;
}
