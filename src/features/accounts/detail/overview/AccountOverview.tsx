import React from 'react';

import { Banner } from '@/components/ds';
import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { AccountHeaderCard } from './AccountHeaderCard';
import { CardOverview } from './CardOverview';
import { buildHeaderModel, reconciliationBanner } from './headerModel';

/**
 * The Overview of one account. The per-type switch lives here: cards get the full Overview;
 * the other types show only the header block until their bodies are built.
 */
export async function AccountOverview({
  account,
  today,
}: {
  account: Account;
  today: string;
}) {
  const disagreement = reconciliationBanner(account.reconciliationGap);
  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      {disagreement ? <Banner tone="warning">{disagreement}</Banner> : null}
      {account.type === AccountType.CREDIT_CARD ? (
        <CardOverview account={account} today={today} />
      ) : (
        <AccountHeaderCard
          accountId={account.id}
          accountName={account.name}
          model={buildHeaderModel(account, null, today)}
        />
      )}
    </div>
  );
}
