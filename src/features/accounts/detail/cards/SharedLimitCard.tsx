import React from 'react';

import { Card, ListField } from '@/components/ds';
import { OpenDialogButton } from '@/features/accounts/form/ds/OpenDialogButton';

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
        <OpenDialogButton variant="secondary" size="sm" param="edit" value="1">
          Change
        </OpenDialogButton>
      }
    >
      {model.thisCard ? <ListField label="This card" value={model.thisCard} /> : null}
      {model.shared ? <ListField label="Shared limit" value={model.shared} /> : null}
    </Card>
  );
}
