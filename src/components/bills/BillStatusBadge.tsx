import { Badge } from '@/components/ui/badge';
import type { BillStatus } from '@/lib/api/types';

import { billStatusLabel, billStatusTone } from './bills.helpers';

interface BillStatusBadgeProps {
  status: BillStatus;
  daysUntilDue?: number | null;
  className?: string;
}

export function BillStatusBadge({ status, daysUntilDue, className }: BillStatusBadgeProps) {
  return (
    <Badge variant={billStatusTone(status, daysUntilDue)} size="sm" className={className} data-testid="bill-status">
      {billStatusLabel(status)}
    </Badge>
  );
}
