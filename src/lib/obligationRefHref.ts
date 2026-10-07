import type { ObligationKind } from '@/lib/transaction.types';

/** Where an obligation ref's badge / "Open" link goes, keyed by kind. */
export function obligationRefHref(kind: ObligationKind, parentId: string): string {
  if (kind === 'LENDING') return `/loans/lendings/${parentId}`;
  if (kind === 'DIVIDEND') return `/investments/dividends?instrumentId=${parentId}`;
  return `/loans/${parentId}`;
}
