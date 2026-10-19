import React from 'react';

import { Badge, Card, Text } from '@/components/ds';

import { accountHref } from './accountTabsModel';
import { HeaderLink } from './overview/HeaderLink';

export function IdentifiersCard({
  accountId,
  identifiers,
  noun = 'account',
}: {
  accountId: string;
  identifiers: string[];
  /** "card" on a credit card's page. */
  noun?: string;
}) {
  return (
    <Card
      title="Identifiers"
      subtitle={`How Gmail alerts and statements find this ${noun}`}
      action={<HeaderLink href={`${accountHref(accountId)}?edit=1`}>Edit</HeaderLink>}
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
