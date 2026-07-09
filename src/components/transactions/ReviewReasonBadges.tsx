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
        let label = 'Needs review';
        let variant: 'warning' | 'info' | 'outline' = 'outline';

        if (reason === 'UNRECONCILED') {
          label = 'Unreconciled';
          variant = 'warning';
        } else if (reason === 'CATEGORY_UNVERIFIED') {
          label = 'Category unverified';
          variant = 'info';
        } else if (reason === 'DUPLICATE_SUSPECT') {
          label = 'Possible duplicate';
          variant = 'warning';
        }

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
