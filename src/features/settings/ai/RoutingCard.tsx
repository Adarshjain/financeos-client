'use client';

import React from 'react';

import { Badge, Banner, Button, Card, CardHeader, CardSubtitle, CardTitle, Icon, ListRow, Text } from '@/components/ds';

import { routingParts } from './aiModel';
import type { RoutingGroupEditor } from './routingGroups';

function OrderLine({ group }: { group: RoutingGroupEditor }) {
  const parts = routingParts(group.dto.entries);
  return (
    <Text variant="label" tone="ink-3" as="div">
      {parts.map((part, i) => (
        <React.Fragment key={part.key}>
          {i > 0 ? ' · ' : null}
          {part.position}{' '}
          {part.custom ? (
            <>
              <Text variant="label" tone="ink-2" as="span" mono>
                {part.label}
              </Text>{' '}
              ({part.providerName})
            </>
          ) : (
            part.label
          )}
        </React.Fragment>
      ))}
    </Text>
  );
}

interface RoutingCardProps {
  groups: RoutingGroupEditor[];
  error: string | null;
}

/** The two routing groups: their order at a glance, with Reset (custom only) and Customise. */
export function RoutingCard({ groups, error }: RoutingCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Routing</CardTitle>
          <CardSubtitle truncate={false}>Tried in order. Options without a key are skipped automatically.</CardSubtitle>
        </div>
      </CardHeader>
      {error ? (
        <div className="px-space-16 pb-space-10">
          <Banner tone="danger">{error}</Banner>
        </div>
      ) : null}
      {groups.map((g) => (
        <ListRow
          wrap
          key={g.group}
          title={
            <span className="flex flex-wrap items-center gap-x-space-8 min-w-0">
              <span>{g.dto.displayName}</span>
              <Badge tone={g.dto.usingDefaults ? 'neutral' : 'info'}>{g.dto.usingDefaults ? 'Default' : 'Custom'}</Badge>
            </span>
          }
          trailing={
            <>
              {!g.dto.usingDefaults ? (
                <Text variant="label" as="span">
                  <Button variant="link" size="sm" disabled={g.resetting} onClick={g.onReset}>
                    {g.resetting ? <Icon name="spinner" size="xs" className="animate-spin" /> : null}
                    Reset
                  </Button>
                </Text>
              ) : null}
              <Button variant="secondary" size="sm" onClick={g.onStart}>
                Customise
              </Button>
            </>
          }
        >
          <OrderLine group={g} />
        </ListRow>
      ))}
    </Card>
  );
}
