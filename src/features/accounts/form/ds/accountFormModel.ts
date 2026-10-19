import {
  type Account,
  type AccountRequest,
  type CreditLimitPool,
  getIngestFromDate,
  supportsIngestion,
} from '@/lib/account.types';
import { AccountType, type FinancialPosition } from '@/lib/types';

export { hrefWithoutParam } from '@/lib/dialogParam';

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

/** The type slug in `?add=` ("bank_account"…), or null for `?add=1` and anything else. */
export function parseAddType(param: string | null | undefined): AccountType | null {
  return ACCOUNT_TYPE_OPTIONS.find((o) => o.value === param)?.value ?? null;
}

/** A card is a liability; everything else starts as an asset. */
export function defaultFinancialPosition(type: AccountType): FinancialPosition {
  return type === AccountType.CREDIT_CARD ? 'liability' : 'asset';
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
}

export type FieldKey = Exclude<keyof AccountFormValues, 'type'>;

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
  return `Changing the name or amount also changes it for the ${others} other ${others === 1 ? 'account' : 'accounts'} sharing this limit.`;
}

/** Money as typed: blank is undefined, commas are ignored, anything else non-numeric is NaN. */
export function parseAmount(raw: string): number | undefined {
  const trimmed = raw.replaceAll(',', '').trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : Number.NaN;
}

export type FormErrors = Partial<Record<FieldKey, string>>;

const FOUR_DIGITS = /^\d{4}$/;
const INVALID_AMOUNT = 'Enter a valid amount.';

export function validateAccountForm(values: AccountFormValues): FormErrors {
  const { type } = values;
  const errors: FormErrors = {};
  if (!type) return errors;
  const fields = new Set(fieldsFor(type, values.limitPoolChoice));

  if (!values.name.trim()) errors.name = 'Name is required';

  const checkOptionalAmount = (key: 'openingBalance' | 'cashBalance') => {
    if (fields.has(key) && Number.isNaN(parseAmount(values[key]))) errors[key] = INVALID_AMOUNT;
  };
  checkOptionalAmount('openingBalance');
  checkOptionalAmount('cashBalance');

  if (fields.has('bank') && !values.bank) errors.bank = 'Select a bank.';

  if (type === AccountType.BANK_ACCOUNT) {
    const last4 = values.last4.trim();
    if (last4 && !FOUR_DIGITS.test(last4)) errors.last4 = 'Enter the last 4 digits.';
  }

  if (type === AccountType.CREDIT_CARD) {
    if (!FOUR_DIGITS.test(values.last4.trim())) errors.last4 = 'Enter the last 4 digits of the card.';
    if (!values.anniversaryDate) errors.anniversaryDate = 'Enter the card anniversary.';
    const pooled = values.limitPoolChoice !== LIMIT_POOL_NONE;
    if (!pooled) {
      const own = parseAmount(values.creditLimit);
      if (Number.isNaN(own)) errors.creditLimit = INVALID_AMOUNT;
      else if (own === undefined) errors.creditLimit = 'Enter a credit limit.';
    }
    if (pooled) {
      const name = values.limitPoolName.trim();
      if (!name) errors.limitPoolName = 'Name is required';
      else if (name.length > 150) errors.limitPoolName = 'Use 150 characters or fewer.';
      const amount = parseAmount(values.limitPoolLimit);
      if (amount === undefined || Number.isNaN(amount) || amount <= 0) {
        errors.limitPoolLimit = 'Enter an amount above ₹0';
      }
    }
  }

  if (type === AccountType.BROKER && !values.provider.trim()) errors.provider = 'Provider is required.';

  return errors;
}

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
        ...password,
      };
    case AccountType.CREDIT_CARD: {
      const pooled = values.limitPoolChoice !== LIMIT_POOL_NONE;
      return {
        ...common,
        type,
        bank: values.bank,
        ingestFromDate,
        last4: values.last4.trim(),
        creditLimit: pooled ? null : (parseAmount(values.creditLimit) ?? null),
        limitPool: pooled
          ? {
              id: values.limitPoolChoice === LIMIT_POOL_NEW ? null : values.limitPoolChoice,
              name: values.limitPoolName.trim(),
              creditLimit: parseAmount(values.limitPoolLimit),
            }
          : null,
        anniversaryDate: values.anniversaryDate,
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

/** yyyy-mm-dd as dd/mm/yyyy. */
export function formatDmy(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
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
    ? `Account created, but these identifiers could not be added: ${failed.join(', ')}. Add them again from Edit account.`
    : `Saved, but these identifiers could not be updated: ${failed.join(', ')}.`;
}
