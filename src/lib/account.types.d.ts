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


interface AccountBase {
  id: string;
  name: string;
  type: AccountType;
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
  openingBalance?: string;
  last4?: string;
  statementPassword?: string;
  lastStatementDate?: string | null;
}

export type CreditCard = AccountBase & {
  last4: string;
  creditLimit: number;
  paymentDueDay: number;
  gracePeriodDays: number;
  statementPassword?: string;
  lastStatementDate?: string | null;
}

export type Stock = AccountBase & {
  instrumentCode: string;
  lastTradedPrice?: string;
}

export type MutualFund = AccountBase & {
  instrumentCode: string;
  lastTradedPrice?: string;
}

export type Account = AccountBase | BankAccount | CreditCard | Stock | MutualFund;