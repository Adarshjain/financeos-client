import { notFound } from 'next/navigation';

import { fetchLoanDetailAction, fetchLoanScheduleAction } from '@/actions/loans';
import { LoanDetail } from '@/app/(protected)/loans/[id]/LoanDetail';
import type { Account } from '@/lib/account.types';
import { accountsApi } from '@/lib/apiClient';

interface LoanDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: LoanDetailPageProps) {
  const { id } = await params;
  const res = await fetchLoanDetailAction(id);
  if (!res.success) return { title: 'Loan Not Found' };
  return {
    title: `${res.data.loan.name} | FinanceOS`,
  };
}

export default async function LoanDetailPage({ params }: LoanDetailPageProps) {
  const { id } = await params;

  const [detailRes, scheduleRes, bankAccounts] = await Promise.all([
    fetchLoanDetailAction(id),
    fetchLoanScheduleAction(id),
    accountsApi.list().catch(() => [] as Account[]),
  ]);

  if (!detailRes.success) {
    notFound();
  }

  const initialDetail = detailRes.data;
  const initialSchedule = scheduleRes.success ? scheduleRes.data.installments : [];
  const filteredAccounts = bankAccounts.filter((a: Account) => a.type === 'bank_account');

  return (
    <LoanDetail
      initialDetail={initialDetail}
      initialSchedule={initialSchedule}
      bankAccounts={filteredAccounts}
    />
  );
}
