import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { BankOverview } from './BankOverview';
import { BrokerOverview } from './BrokerOverview';
import { CardOverview } from './CardOverview';
import { reconciliationBanner } from './headerModel';
import { WalletOverview } from './WalletOverview';

/** The Overview of one account. The per-type switch lives here; each type builds its own body. */
export async function AccountOverview({
  account,
  today,
}: {
  account: Account;
  today: string;
}) {
  const disagreement = reconciliationBanner(account.reconciliationGap);
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      {disagreement ? (
        <Banner tone="warning" title={disagreement.title}>
          {disagreement.body}
        </Banner>
      ) : null}
      {account.type === AccountType.CREDIT_CARD ? (
        <CardOverview account={account} today={today} />
      ) : account.type === AccountType.BANK_ACCOUNT ? (
        <BankOverview account={account} today={today} />
      ) : account.type === AccountType.BROKER ? (
        <BrokerOverview account={account} today={today} />
      ) : (
        <WalletOverview account={account} today={today} />
      )}
    </div>
  );
}
