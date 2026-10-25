'use client';

import React from 'react';

import { Badge, Card, ListRow, ProgressBar, SectionHeader, Text } from '@/components/ds';
import { appHref } from '@/features/shell/routes';
import type { RewardRule } from '@/lib/rewards.types';

import { HeaderLink } from '../overview/HeaderLink';
import type { CardholderRow, CompletedMilestones, MilestoneModel, RuleExtras, RuleLine } from './rewardsModel';
import { RuleEditor } from './RuleEditor';

/** The milestones still to reach, one block each, then the finished ones under a "Completed" section, in one "Milestones" card. */
export function MilestonesCard({
  items,
  completed,
}: {
  items: { key: string; model: MilestoneModel }[];
  completed?: CompletedMilestones | null;
}) {
  return (
    <Card title="Milestones">
      {items.map(({ key, model }) => (
        <ListRow
          key={key}
          title={model.title}
          subtitle={model.subtitle}
          trailing={model.status ? <Badge tone={model.status.tone}>{model.status.label}</Badge> : undefined}
        >
          <div className="flex flex-col gap-space-6 mt-space-6">
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
        </ListRow>
      ))}
      {completed ? (
        <>
          <SectionHeader variant="band" meta={completed.paid ? `${completed.paid} paid` : undefined}>
            {`Completed · ${completed.count}`}
          </SectionHeader>
          {completed.rows.map((row) => (
            <ListRow
              key={row.id}
              title={row.title}
              subtitle={row.subtitle}
              trailing={<Text variant="body-strong">{row.payout}</Text>}
            />
          ))}
        </>
      ) : null}
    </Card>
  );
}

/** Earnings split by cardholder; the transactions with no card are Unattributed. */
export function CardholdersCard({ rows, subtitle }: { rows: CardholderRow[]; subtitle: string }) {
  return (
    <Card title="By cardholder" subtitle={subtitle}>
      {rows.map((row) => (
        <ListRow
          key={row.id}
          title={row.title}
          subtitle={row.subtitle}
          trailing={<Text variant="body-strong">{row.earned}</Text>}
        />
      ))}
    </Card>
  );
}

export function RulesCard({
  accountId,
  rules,
  extras,
  all,
}: {
  accountId: string;
  rules: RuleLine[];
  extras: Record<string, RuleExtras>;
  /** The full rules, so a tap can open one in the rule dialog; null when the rule list failed to load. */
  all: readonly RewardRule[] | null;
}) {
  // The rule dialog opens from state, not the address.
  const [editing, setEditing] = React.useState<RewardRule | null>(null);
  return (
    <Card
      title="Rules on this account"
      subtitle="First match wins"
      action={
        <HeaderLink href={appHref(`/rewards/rules?account=${accountId}`)} chevron>
          Manage
        </HeaderLink>
      }
    >
      {rules.map((rule) => {
        const { bars, note } = extras[rule.id] ?? { bars: [], note: null };
        const full = all?.find((r) => r.id === rule.id);
        return (
          <ListRow
            key={rule.id}
            title={rule.title}
            subtitle={rule.description || undefined}
            trailing={<Text variant="body-strong">{rule.earned}</Text>}
            clickable={Boolean(full)}
            onClick={full ? () => setEditing(full) : undefined}
          >
            {bars.length > 0 || note ? (
              <div className="flex flex-col gap-space-6 mt-space-6">
                {bars.map((bar) => (
                  <ProgressBar key={bar.key} value={bar.pct} tone={bar.tone} label={bar.label} />
                ))}
                {note ? (
                  <Text variant="caption" tone="ink-3" as="div">
                    {note}
                  </Text>
                ) : null}
              </div>
            ) : null}
          </ListRow>
        );
      })}
      {editing && all ? (
        <RuleEditor accountId={accountId} rule={editing} rules={all} onClose={() => setEditing(null)} />
      ) : null}
    </Card>
  );
}
