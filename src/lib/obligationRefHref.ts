import type { ObligationKind } from '@/lib/transaction.types';

/** Where an obligation ref's badge / "Open" link goes, keyed by kind. */
export function obligationRefHref(kind: ObligationKind, parentId: string): string {
  if (kind === 'LENDING') return `/lending/${parentId}`;
  if (kind === 'DIVIDEND') return `/investments/activity/dividends?instrumentId=${parentId}`;
  if (kind === 'EPF_WITHDRAWAL') return '/investments/retirement/epf';
  if (kind === 'NPS_CONTRIBUTION') return '/investments/retirement/nps';
  return `/loans/${parentId}`;
}
