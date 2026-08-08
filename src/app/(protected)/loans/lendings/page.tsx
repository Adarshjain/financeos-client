import { fetchCounterpartiesAction } from '@/actions/lendings';
import { fetchLoansSummaryAction } from '@/actions/loans';
import { LendingsBrowser } from '@/app/(protected)/loans/lendings/LendingsBrowser';

export const metadata = {
  title: 'Lendings Ledger | FinanceOS',
  description: 'Track person-to-person money lent and borrowed.',
};

export default async function LendingsPage() {
  const [cpRes, summaryRes] = await Promise.all([
    fetchCounterpartiesAction(0, 50),
    fetchLoansSummaryAction(),
  ]);

  const initialCounterparties = cpRes.success
    ? cpRes.data
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

  return (
    <LendingsBrowser
      initialCounterparties={initialCounterparties}
      summary={summary}
    />
  );
}
