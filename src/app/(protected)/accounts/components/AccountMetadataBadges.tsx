import { RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Account, isAccountClosed, isAccountClosing } from '@/lib/account.types';
import { formatDate, getPositionLabel } from '@/lib/utils';

export function AccountMetadataBadges({ account }: { account: Account }) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {isAccountClosed(account) ? (
        <Badge variant="destructive" className="text-2xs py-0 px-2 font-semibold uppercase">
          Closed · {formatDate(account.closedOn!)}
        </Badge>
      ) : isAccountClosing(account) ? (
        <Badge variant="warning" className="text-2xs py-0 px-2 font-semibold uppercase">
          Closing {formatDate(account.closedOn!)}
        </Badge>
      ) : null}
      <Badge
        variant={account.financialPosition === 'liability' ? 'warning' : 'success'}
        className="text-2xs py-0 px-2 font-semibold uppercase"
      >
        {getPositionLabel(account.financialPosition)}
      </Badge>
      {account.excludeFromNetAsset ? (
        <Badge variant="destructive" className="text-2xs py-0 px-2 font-semibold uppercase">
          Excluded
        </Badge>
      ) : null}
      {account.ingestFromDate ? (
        <Badge
          variant="info"
          className="text-2xs py-0 px-2 font-semibold uppercase flex items-center gap-1"
        >
          <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
          Sync Active
        </Badge>
      ) : null}
    </div>
  );
}
