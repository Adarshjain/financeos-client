import React from 'react';

import { parseInstallmentParam } from '@/features/loans/detail/installmentParam';
import { loadLoanPage } from '@/features/loans/detail/loanDetailData';
import { LoanDetailView } from '@/features/loans/detail/LoanDetailView';
import { todayInAppZone } from '@/lib/date-range';

/** /ds/loans/[id]: one loan. `?installment=N` opens that EMI's financial year and highlights its row. */
export default async function DsLoanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ installment?: string | string[] }>;
}) {
  const { id } = await params;
  const highlightSeq = parseInstallmentParam((await searchParams).installment);
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
