import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { parseInstallmentParam } from '@/app/(protected)/loans/[id]/installmentParam';
import { LoanDetail } from '@/app/(protected)/loans/[id]/LoanDetail';
import { accountsApi, loansApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

interface LoanDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ installment?: string | string[] }>;
}

export async function generateMetadata({ params }: LoanDetailPageProps) {
  const { id } = await params;
  try {
    const detail = await loansApi.getDetail(id);
    return { title: `${detail.loan.name} | FinanceOS` };
  } catch {
    return { title: 'Loan Not Found' };
  }
}

export default async function LoanDetailPage({ params, searchParams }: LoanDetailPageProps) {
  const { id } = await params;
  const highlightSeq = parseInstallmentParam((await searchParams)?.installment);

  const [detail, schedule] = await Promise.all([
    loansApi.getDetail(id).catch(() => null),
    loansApi.getSchedule(id).catch(() => []),
  ]);

  if (!detail) {
    notFound();
  }

  const qc = getQueryClient();
  qc.setQueryData(keys.loans.byId(id), detail);
  qc.setQueryData(keys.loans.schedule(id), schedule);
  await qc.prefetchQuery({
    queryKey: keys.accounts.list(),
    queryFn: () => accountsApi.list(),
  });

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <LoanDetail loanId={id} highlightSeq={highlightSeq} />
    </HydrationBoundary>
  );
}
