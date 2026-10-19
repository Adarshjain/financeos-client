import React from 'react';

import { Badge, Card, Text } from '@/components/ds';

import { HeaderDialogLink } from './overview/HeaderLink';

export function IdentifiersCard({
  identifiers,
  noun = 'account',
}: {
  identifiers: string[];
  /** "card" on a credit card's page. */
  noun?: string;
}) {
  return (
    <Card
      title="Identifiers"
      subtitle={`How Gmail alerts and statements find this ${noun}`}
      action={<HeaderDialogLink>Edit</HeaderDialogLink>}
    >
      <div className="px-space-16 pt-space-4 pb-space-14 flex flex-wrap gap-space-6">
        {identifiers.length > 0 ? (
          identifiers.map((value) => (
            <Badge key={value} tone="neutral">
              {value}
            </Badge>
          ))
        ) : (
          <Text variant="caption" tone="ink-3">
            No identifiers yet
          </Text>
        )}
      </div>
    </Card>
  );
}
