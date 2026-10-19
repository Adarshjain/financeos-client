import Link from 'next/link';
import React from 'react';

import { Button, Card, ListField } from '@/components/ds';

import { accountHref } from '../accountTabsModel';
import type { SharedLimitModel } from './cardsModel';

/** A credit card's own limit and the shared limit it draws on. Change opens Edit account. */
export function SharedLimitCard({
  accountId,
  model,
}: {
  accountId: string;
  model: SharedLimitModel;
}) {
  return (
    <Card
      title="Shared limit"
      subtitle="Some banks give several cards one limit"
      action={
        <Button asChild variant="secondary" size="sm">
          <Link href={`${accountHref(accountId)}?edit=1`}>Change</Link>
        </Button>
      }
    >
      <ListField label="This card" value={model.thisCard} />
      <ListField label="Shared limit" value={model.shared} />
    </Card>
  );
}
