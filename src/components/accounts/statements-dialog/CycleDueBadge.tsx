'use client';

import { Badge } from '@/components/ui/badge';
import { useBill } from '@/lib/query/hooks/useBills';

import { cycleSummaryDaysUntilDue } from './cycleSummaryDue';

interface CycleDueBadgeProps {
  statementId: string;
  summaryDaysUntilDue: number | null | undefined;
}

/** "Due in N days" / "Due today" / "N days overdue" for the card cycle summary, driven by the bill. */
export function CycleDueBadge({ statementId, summaryDaysUntilDue }: CycleDueBadgeProps) {
  const { data, status } = useBill(statementId);
  const bill = data && typeof data === 'object' && 'status' in data ? data : null;
  const days = cycleSummaryDaysUntilDue(summaryDaysUntilDue, { status, bill });
  if (days === null) return null;

  return (
    <div className="pt-1" data-testid="cycle-due-badge">
      {days > 0 ? (
        <Badge variant={days <= 3 ? 'warning' : 'secondary'} className="text-2xs">
          Due in {days} days
        </Badge>
      ) : days === 0 ? (
        <Badge variant="warning" className="text-2xs bg-amber-500 text-white">
          Due today
        </Badge>
      ) : (
        <Badge variant="destructive" className="text-2xs">
          {Math.abs(days)} days overdue
        </Badge>
      )}
    </div>
  );
}
