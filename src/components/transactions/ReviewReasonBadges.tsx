import { REVIEW_REASON_META } from '@/components/transactions/catalog';
import { Badge } from '@/components/ui/badge';
import { ReviewReason, ReviewType } from '@/lib/transaction.types';
import { cn } from '@/lib/utils';

interface ReviewReasonBadgesProps {
  reviewType?: ReviewType;
  reviewReasons?: ReviewReason[];
  className?: string;
}

export function ReviewReasonBadges({ reviewType, reviewReasons, className }: ReviewReasonBadgesProps) {
  if (reviewType !== 'NEEDS_REVIEW') return null;

  if (!reviewReasons || reviewReasons.length === 0) {
    return (
      <Badge variant="warning" className={cn("text-2xs py-0.5 px-1 font-bold rounded-md", className)}>
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
            className={cn("text-2xs py-0.5 px-2 font-bold rounded-md", className)}
          >
            {label}
          </Badge>
        );
      })}
    </>
  );
}
