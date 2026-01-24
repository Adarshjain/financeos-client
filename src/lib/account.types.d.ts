import { AccountType, FinancialPosition } from '@/lib/types';

interface Account {
  name: string;
  type: AccountType;
  excludeFromNetAsset?: boolean;
  financialPosition?: FinancialPosition;
  description?: string;
}

export type BankDetails = Account & {
  openingBalance?: string;
  last4?: string;
}

export type CreditCardDetails = Account & {
  last4: string;
  creditLimit: number;
  paymentDueDay: number;
  gracePeriodDays: number;
  statementPassword?: string;
}

export type StockDetails = Account & {
  instrumentCode: string;
  lastTradedPrice?: string;
}

export type MutualFundDetails = Account & {
  instrumentCode: string;
  lastTradedPrice?: string;
}

type GroupedAccount = Account | BankDetails | CreditCardDetails | StockDetails | MutualFundDetails;