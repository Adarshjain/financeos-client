import { Account, isAccountOfType } from '@/lib/account.types';
import { accountsApi, dividendsApi, investmentsApi, sipsApi } from '@/lib/apiClient';
import {
  AccountType,
  Dividend,
  InvestmentTransactionResponse,
  Position,
  Sip,
} from '@/lib/types';

import { InvestmentsView } from './InvestmentsView';

export default async function InvestmentsPage() {
  const [summary, positionsData, transactionsData, dividendsData, sipsData, accounts] = await Promise.all([
    investmentsApi.getSummary().catch(() => null),
    investmentsApi.getPositions().catch(() => ({ positions: [] })),
    investmentsApi.listTransactions(0, 100).catch(() => ({ content: [] as InvestmentTransactionResponse[], totalElements: 0, page: 0, size: 50, totalPages: 0 })),
    dividendsApi.list().catch(() => ({ content: [] as Dividend[], totalElements: 0, page: 0, size: 50, totalPages: 0 })),
    sipsApi.list().catch(() => [] as Sip[]),
    accountsApi.list().catch(() => [] as Account[]),
  ]);

  const investmentTransactions: InvestmentTransactionResponse[] =
    (transactionsData.content as InvestmentTransactionResponse[]) || [];
  const positions: Position[] = positionsData.positions || [];
  const dividends: Dividend[] = dividendsData.content || [];
  const sips: Sip[] = Array.isArray(sipsData) ? sipsData : [];
  const brokerAccounts = accounts.filter(isAccountOfType(AccountType.BROKER));

  return (
    <InvestmentsView
      summary={summary}
      positions={positions}
      investmentTransactions={investmentTransactions}
      dividends={dividends}
      sips={sips}
      brokerAccounts={brokerAccounts}
      accounts={accounts}
    />
  );
}
