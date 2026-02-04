import { AccountType, FinancialPosition } from '@/lib/types';

export interface AccountRequestBase {
  name: string;
  excludeFromNetAsset?: boolean;
  financialPosition?: FinancialPosition;
  description?: string;
}

export type BankAccountRequest = AccountRequestBase & {
  type: AccountType.BANK_ACCOUNT;
  openingBalance?: number;
  last4?: string;
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
}

export type BankAccount = AccountBase & {
  openingBalance?: string;
  last4?: string;
}

export type CreditCard = AccountBase & {
  last4: string;
  creditLimit: number;
  paymentDueDay: number;
  gracePeriodDays: number;
  statementPassword?: string;
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