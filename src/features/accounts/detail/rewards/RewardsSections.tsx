import React from 'react';

import { Badge, Card, ListRow, ProgressBar, Text } from '@/components/ds';

import { HeaderLink } from '../overview/HeaderLink';
import type { MilestoneModel, RuleLine } from './rewardsModel';

export function MilestoneCard({ model }: { model: MilestoneModel }) {
  return (
    <Card
      title={model.title}
      subtitle={model.subtitle}
      action={model.status ? <Badge tone={model.status.tone}>{model.status.label}</Badge> : undefined}
    >
      <div className="px-space-16 pb-space-16 flex flex-col gap-space-6">
        <div className="flex items-baseline justify-between gap-space-12">
          <Text variant="body-strong">{model.figure.done}</Text>
          <Text variant="body" tone="ink-3">
            {model.figure.of}
          </Text>
        </div>
        <ProgressBar value={model.pct} />
        <Text variant="caption" tone="ink-3" as="div">
          {model.caption}
        </Text>
      </div>
    </Card>
  );
}

export function RulesCard({ accountId, rules }: { accountId: string; rules: RuleLine[] }) {
  return (
    <Card
      title="Rules on this account"
      subtitle="First match wins"
      action={
        <HeaderLink href={`/rewards/rules?account=${accountId}`} chevron>
          Manage
        </HeaderLink>
      }
    >
      {rules.map((rule) => (
        <ListRow
          key={rule.id}
          title={rule.title}
          subtitle={rule.description || undefined}
          trailing={<Text variant="body-strong">{rule.earned}</Text>}
        />
      ))}
    </Card>
  );
}
