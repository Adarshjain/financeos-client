import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { ListField } from '@/components/ds/ListField/ListField';

import { HeaderDialogLink } from '../overview/HeaderLink';
import type { SharedLimitModel } from './cardsModel';

/** A credit card's own limit and the shared limit it draws on. Change opens Edit account. */
export function SharedLimitCard({
  model,
}: {
  model: SharedLimitModel;
}) {
  return (
    <Card
      title="Shared limit"
      subtitle="Some banks give several cards one limit"
      action={
        <HeaderDialogLink>
          Change
        </HeaderDialogLink>
      }
    >
      {model.thisCard ? <ListField label="This card" value={model.thisCard} /> : null}
      {model.shared ? <ListField label="Shared limit" value={model.shared} /> : null}
    </Card>
  );
}
