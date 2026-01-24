import { AccountType, FinancialPosition } from '@/lib/types';

interface AccountRequestBase {
  name: string;
  type: AccountType;
  excludeFromNetAsset?: boolean;
  financialPosition?: FinancialPosition;
  description?: string;
}

export type BankAccountRequest = AccountRequestBase & {
  openingBalance?: string;
  last4?: string;
}

export type CreditCardRequest = AccountRequestBase & {
  last4: string;
  creditLimit: number;
  paymentDueDay: number;
  gracePeriodDays: number;
  statementPassword?: string;
}

export type StockRequest = AccountRequestBase & {
  instrumentCode: string;
  lastTradedPrice?: string;
}

export type MutualFundRequest = AccountRequestBase & {
  instrumentCode: string;
  lastTradedPrice?: string;
}

export type AccountRequest = AccountRequestBase | BankAccountRequest | CreditCardRequest | StockRequest | MutualFundRequest;


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