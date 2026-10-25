// Pure helper behind the loan_payoff widget (moved from the Legacy widget, which imports it back).

import type { LoanResponse } from '@/lib/loan.types';

/** Share of the original principal repaid so far, 0–100. */
export function principalRepaidPct(loan: Pick<LoanResponse, 'principal' | 'outstandingPrincipal'>): number {
  if (!(loan.principal > 0)) return 0;
  const pct = ((loan.principal - loan.outstandingPrincipal) / loan.principal) * 100;
  return Math.max(0, Math.min(100, pct));
}
