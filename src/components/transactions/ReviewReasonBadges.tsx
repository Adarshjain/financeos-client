import { REVIEW_REASON_META } from '@/components/transactions/catalog';
import { Badge } from '@/components/ui/badge';
import { ReviewReason, ReviewType } from '@/lib/transaction.types';

interface ReviewReasonBadgesProps {
  reviewType?: ReviewType;
  reviewReasons?: ReviewReason[];
}

export function ReviewReasonBadges({ reviewType, reviewReasons }: ReviewReasonBadgesProps) {
  if (reviewType !== 'NEEDS_REVIEW') return null;

  if (!reviewReasons || reviewReasons.length === 0) {
    return (
      <Badge variant="warning" className="text-[9px] py-0 px-2 font-bold rounded-md">
        Needs Review
      </Badge>
    );
  }

  return (
    <>
      {reviewReasons.map((reason) => {
        const { label, variant } = REVIEW_REASON_META[reason] ?? {
          label: reason,
          variant: 'outline' as const,
        };

        return (
          <Badge
            key={reason}
            variant={variant}
            className="text-[9px] py-0 px-2 font-bold rounded-md"
          >
            {label}
          </Badge>
        );
      })}
    </>
  );
}
