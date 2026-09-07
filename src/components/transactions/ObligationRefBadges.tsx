import { HandCoins, Landmark } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import type { ObligationRef } from '@/lib/transaction.types';

interface ObligationRefBadgesProps {
  refs?: ObligationRef[];
}

/**
 * Badges linking a transaction to the lending ledger entry / loan row that
 * references it via direct FK. Always indigo — these are never a
 * destructive/warning signal like a transfer/refund link can be — and never
 * open the transaction's own detail dialog, so clicks stop propagation before
 * the wrapping card's open-detail handler sees them.
 */
export function ObligationRefBadges({ refs }: ObligationRefBadgesProps) {
  if (!refs?.length) return null;

  return (
    <>
      {refs.map((ref) => {
        const Icon = ref.kind === 'LENDING' ? HandCoins : Landmark;
        const badge = (
          <Badge
            variant="secondary"
            className="text-2xs py-0 px-2 font-bold tracking-tight rounded-md inline-flex items-center gap-1 border bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
          >
            <Icon className="h-2.5 w-2.5 text-indigo-600 dark:text-indigo-400" />
            <span>{ref.label}</span>
          </Badge>
        );

        if (!ref.parentId) {
          return <span key={`${ref.kind}-${ref.id}`}>{badge}</span>;
        }

        const href =
          ref.kind === 'LENDING'
            ? `/loans/lendings/${ref.parentId}`
            : `/loans/${ref.parentId}`;

        return (
          <Link
            key={`${ref.kind}-${ref.id}`}
            href={href}
            onClick={(e) => e.stopPropagation()}
          >
            {badge}
          </Link>
        );
      })}
    </>
  );
}
