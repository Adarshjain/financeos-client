import { Badge } from '@/components/ui/badge';
import type { ReviewType, StatementVerdict } from '@/lib/statement.types';

/**
 * Presentation for a statement's ingestion verdict and a transaction's review
 * state.
 *
 * Extracted from StatementsDialog, where they were closure-free helpers declared
 * inside the component body — so they were reallocated on every render and could
 * not be reused by anything else. The tooltip copy explains what the backend's
 * verdict actually means, which is worth having in one place.
 */
export function StatementVerdictBadge({ verdict }: { verdict: StatementVerdict }) {
  switch (verdict) {
    case 'AUTO_INGEST':
      return (
        <span title="Statement parsed clean with 100% chain continuity and valid checksums. Automatically accepted.">
          <Badge variant="success" className="cursor-help">Auto Ingested</Badge>
        </span>
      );
    case 'NEEDS_REVIEW':
      return (
        <span title="Statement parsed with minor issues or chain validation gaps (< 99%). Review required before final reconciliation.">
          <Badge variant="warning" className="cursor-help">Needs Review</Badge>
        </span>
      );
    case 'REJECTED':
      return (
        <span title="Statement failed critical validation (broken checksum, missing opening/closing balances, or unparseable format).">
          <Badge variant="destructive" className="cursor-help">Rejected</Badge>
        </span>
      );
    default:
      return <Badge variant="secondary">{verdict}</Badge>;
  }
}

export function ReviewTypeBadge({ reviewType }: { reviewType: ReviewType }) {
  switch (reviewType) {
    case 'AUTO_REVIEWED':
      return <Badge variant="success">Auto Reviewed</Badge>;
    case 'NEEDS_REVIEW':
      return <Badge variant="warning">Needs Review</Badge>;
    case 'MANUALLY_REVIEWED':
      return <Badge variant="info">Manually Reviewed</Badge>;
    default:
      return <Badge variant="secondary">{reviewType}</Badge>;
  }
}
