import {Badge, type BadgeProps} from '@/components/ui/badge';
import type {TransactionSource} from '@/lib/transaction.types';

/**
 * How each source is presented on a transaction card.
 *
 * Deliberately `Partial`: `file_upload` has no entry because the card has never
 * shown a badge for it, and a missing entry renders nothing rather than an
 * "Unknown" placeholder.
 */
const SOURCE_BADGE_META: Record<TransactionSource, { label: string; variant: BadgeProps['variant'] }> = {
  gmail_transaction_alert: {label: 'Gmail Alert', variant: 'info'},
  gmail_statement: {label: 'Gmail Statement', variant: 'warning'},
  manual: {label: 'Manual', variant: 'secondary'},
  file_upload: {label: 'File Upload', variant: 'secondary'},
};

interface TransactionSourceBadgeProps {
  source: TransactionSource;
}

export function TransactionSourceBadge({source}: TransactionSourceBadgeProps) {
  const meta = SOURCE_BADGE_META[source];
  if (!meta) return null;

  return (
      <Badge
          variant={meta.variant}
          className="text-2xs py-0.5 px-2 font-bold tracking-wider rounded-md uppercase"
      >
        {meta.label}
      </Badge>
  );
}
