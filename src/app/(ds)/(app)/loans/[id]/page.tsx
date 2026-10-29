import type { Metadata } from 'next';
import React from 'react';

import { loadLoanPage } from '@/features/loans/detail/loanDetailData';
import { LoanDetailView } from '@/features/loans/detail/LoanDetailView';
import { parseLoanUrl } from '@/features/loans/detail/loanUrl';
import type { SearchParams } from '@/features/shell/searchParams';
import { todayInAppZone } from '@/lib/date-range';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { detail } = await loadLoanPage((await params).id);
  return { title: detail.loan.name };
}

/** /loans/[id]: one loan. `?installment=N` opens that EMI's financial year and highlights its row. */
export default async function DsLoanPage({ params, searchParams }: Params & { searchParams: SearchParams }) {
  const { id } = await params;
  const { highlightSeq } = parseLoanUrl(await searchParams);
  const { detail, schedule, paymentAccountName } = await loadLoanPage(id);
  return (
    <LoanDetailView
      detail={detail}
      schedule={schedule}
      paymentAccountName={paymentAccountName}
      today={todayInAppZone()}
      highlightSeq={highlightSeq}
    />
  );
}
