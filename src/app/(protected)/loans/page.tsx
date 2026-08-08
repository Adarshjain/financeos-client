import { fetchLoansAction, fetchLoansSummaryAction } from '@/actions/loans';
import { LoansBrowser } from '@/app/(protected)/loans/LoansBrowser';
import type { Account } from '@/lib/account.types';
import { accountsApi } from '@/lib/apiClient';

export const metadata = {
  title: 'Loans | FinanceOS',
  description: 'Manage formal loans, schedules, prepayments, and effective APR.',
};

export default async function LoansPage() {
  const [loansRes, summaryRes, bankAccounts] = await Promise.all([
    fetchLoansAction(undefined, 0, 50),
    fetchLoansSummaryAction(),
    accountsApi.list().catch(() => [] as Account[]),
  ]);

  const initialLoans = loansRes.success
    ? loansRes.data
    : {
        content: [],
        number: 0,
        size: 50,
        totalElements: 0,
        totalPages: 0,
        first: true,
        last: true,
        empty: true,
      };

  const summary = summaryRes.success
    ? summaryRes.data
    : {
        totalOutstanding: 0,
        activeLoanCount: 0,
        lentOutstanding: 0,
        borrowedOutstanding: 0,
        netReceivable: 0,
      };

  const filteredAccounts = bankAccounts.filter((a: Account) => a.type === 'bank_account');

  return (
    <LoansBrowser
      initialLoans={initialLoans}
      summary={summary}
      bankAccounts={filteredAccounts}
    />
  );
}
