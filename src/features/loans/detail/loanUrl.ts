import { first, type SearchParamsRecord } from '@/features/shell/searchParams';

import { parseInstallmentParam } from './installmentParamModel';

export interface LoanUrl {
  /** The EMI to highlight (`?installment=N`), or null. */
  highlightSeq: number | null;
}

/** What a /loans/[id] address asks for: `?installment=N` opens that EMI's financial year and highlights its row. */
export function parseLoanUrl(params: SearchParamsRecord): LoanUrl {
  return { highlightSeq: parseInstallmentParam(first(params.installment)) };
}
