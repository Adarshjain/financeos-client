'use client';

import React from 'react';

import {
  Button,
  Card,
  ConfirmDialog,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  Icon,
  Menu,
  MenuItem,
  showToast,
  Text,
} from '@/components/ds';
import { useRewardsAdd } from '@/features/rewards/overview/RewardsAdd';
import { dsRewardNotifier } from '@/features/rewards/rewardNotifier';
import { accrualSummary } from '@/features/rewards/rules/manager/helpers';
import { useEndDateAndClone } from '@/features/rewards/rules/useEndDateAndClone';
import { formatDateRange } from '@/lib/date-range';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useCategories } from '@/lib/query/hooks/useCategories';
import type { RewardRule } from '@/lib/rewards.types';
import { AccountType } from '@/lib/types';

import { useRewardAccountConfig } from '../../queries/useRewardAccountConfigQueries';
import { useRewardCapBuckets } from '../../queries/useRewardCapBucketsQueries';
import { useDeleteRewardRule, useRewardRules } from '../../queries/useRewardRulesQueries';
import { appliesTo, capWords, isEnded, ruleSubtitle, type RulesUsage } from '../rulesPageModel';
import { useRefreshUsage } from '../rulesRefresh';
import { ReorderRulesDialog } from './ReorderRulesDialog';
import { RuleDialog } from './RuleDialog';
import { TestTransactionDialog } from './TestTransactionDialog';

type Open = { mode: 'new' } | { mode: 'edit'; rule: RewardRule } | { mode: 'clone'; rule: RewardRule } | null;

interface RuleRow {
  id: string;
  rule: RewardRule;
  position: number;
  ended: boolean;
  /** "exclusive · 15 Mar 2024 → no end · ended". */
  words: string;
  earns: string;
  applies: string;
  cap: string;
  /** What it earned this reward year; null when the report is not loaded. */
  year: { text: string; zero: boolean } | null;
  phoneSub: string;
  onEdit: () => void;
}

const ch = createDataTableColumnHelper<RuleRow>();

const columns = [
      ch.display({
        id: 'position',
        header: '#',
        meta: { size: 'sm', phone: 'hidden' },
        cell: ({ row }) => (
          <Text variant="body" tone="ink-3" as="span">
            {row.original.position}
          </Text>
        ),
      }),
      ch.display({
        id: 'rule',
        header: 'Rule',
        meta: { size: 'fill', grow: 1.5, phone: 'main' },
        cell: ({ row }) => (
          <Text variant="body" truncate tone={row.original.ended ? 'ink-3' : 'ink'}>
            <Text variant="body-strong" as="span" tone={row.original.ended ? 'ink-3' : 'ink'}>
              {row.original.rule.name}
            </Text>
            <Text variant="body" tone="ink-3" as="span">{` · ${row.original.words}`}</Text>
          </Text>
        ),
      }),
      ch.display({
        id: 'earns',
        header: 'Earns',
        meta: { size: 'md', phone: 'hidden' },
        cell: ({ row }) => (
          <Text variant="body" tone={row.original.ended ? 'ink-3' : 'ink'}>
            {row.original.earns}
          </Text>
        ),
      }),
      ch.display({
        id: 'applies',
        header: 'Applies to',
        meta: { size: 'md', phone: 'hidden' },
        cell: ({ row }) => (
          <Text variant="body" tone="ink-3" truncate>
            {row.original.applies}
          </Text>
        ),
      }),
      ch.display({
        id: 'cap',
        header: 'Cap',
        meta: { size: 'md', phone: 'hidden' },
        cell: ({ row }) => (
          <Text variant="body" tone="ink-3" truncate>
            {row.original.cap}
          </Text>
        ),
      }),
      ch.display({
        id: 'year',
        header: 'This year',
        meta: { size: 'sm', align: 'end', phone: 'amount' },
        cell: ({ row }) =>
          row.original.year ? (
            <Text
              variant="body-strong"
              tone={row.original.year.zero ? 'warning' : row.original.ended ? 'ink-3' : 'ink'}
            >
              {row.original.year.text}
            </Text>
          ) : (
            <Text variant="body" tone="ink-3">
              —
            </Text>
          ),
      }),
];

export interface RulesSectionProps {
  accountId: string;
  today: string;
  usage?: RulesUsage['earned'];
}

/** The Rules card of the Earning rules page: the card's rules in the order they are checked, with their actions. */
export function RulesSection({ accountId, today, usage }: RulesSectionProps) {
  const rules = useRewardRules(accountId).data ?? [];
  const capBuckets = useRewardCapBuckets(accountId).data ?? [];
  const categories = useCategories().data ?? [];
  const account = useAccounts().data?.find((a) => a.id === accountId);
  const defaultRewardType = useRewardAccountConfig(accountId).data?.defaultRewardType ?? 'CASH';
  const remove = useDeleteRewardRule();
  const refresh = useRefreshUsage();
  const [open, setOpen] = React.useState<Open>(null);
  const [reordering, setReordering] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [deleting, setDeleting] = React.useState<RewardRule | null>(null);
  const endAndClone = useEndDateAndClone((updated) => {
    refresh();
    setOpen({ mode: 'clone', rule: updated });
  }, dsRewardNotifier);
  // The top bar's + opens a new rule while this card is shown.
  useRewardsAdd(() => setOpen({ mode: 'new' }), Boolean(accountId));

  const isBank = account?.type === AccountType.BANK_ACCOUNT;
  const cardholders = account && 'cardholders' in account ? (account.cardholders ?? []) : [];
  const editing = open && open.mode !== 'new' ? open.rule : undefined;

  const rows: RuleRow[] = rules.map((rule, index) => {
    const ended = isEnded(rule, today);
    const year = usage?.[rule.id] ?? null;
    return {
      id: rule.id,
      rule,
      position: index + 1,
      ended,
      words: [
        rule.stacking === 'EXCLUSIVE' ? 'exclusive' : 'additive',
        rule.activeFrom || rule.activeTo ? formatDateRange(rule.activeFrom, rule.activeTo, { endExclusive: true }) : null,
        ended ? 'ended' : null,
      ]
        .filter(Boolean)
        .join(' · '),
      earns: accrualSummary(rule),
      applies: appliesTo(rule),
      cap: [capWords(rule), rule.perTxnCap != null ? `max ${rule.perTxnCap} / txn` : null].filter(Boolean).join(' · ') || '—',
      year,
      phoneSub: ruleSubtitle(rule, today, year?.text),
      onEdit: () => setOpen({ mode: 'edit', rule }),
    };
  });


  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        showToast('Rule deleted');
        refresh();
        setDeleting(null);
        setOpen(null);
      },
      onError: (e) => dsRewardNotifier.failure(e, 'Failed to delete reward rule'),
    });
  };

  return (
    <Card
      title={account?.name ? `How ${account.name} earns` : 'Rules'}
      subtitle="Checked top to bottom; the first match earns, additive rules add on top"
      action={
        <Menu
          align="end"
          trigger={
            <Button variant="ghost" size="sm" iconOnly aria-label="Rule actions">
              <Icon name="more" size="sm" />
            </Button>
          }
        >
          <MenuItem disabled={!accountId} onSelect={() => setTesting(true)}>
            Test a transaction
          </MenuItem>
          <MenuItem disabled={rules.length < 2} onSelect={() => setReordering(true)}>
            Reorder rules
          </MenuItem>
        </Menu>
      }
    >
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        onRowSelect={(r) => r.onEdit()}
        phoneSub={(r) => r.phoneSub}
        rowState={(r) => (r.ended ? { muted: true } : undefined)}
        empty={
          <EmptyState
            compact
            title="No reward rules on this account yet"
            description="Start with a base rule (e.g. “1% on everything”), then add category bonuses and exclusions above it."
          />
        }
      />

      {open ? (
        <RuleDialog
          key={open.mode === 'new' ? 'new' : `${open.mode}:${open.rule.id}`}
          accountId={accountId}
          rule={open.mode === 'edit' ? open.rule : undefined}
          cloneFrom={open.mode === 'clone' ? open.rule : undefined}
          categories={categories}
          capBuckets={capBuckets}
          cardholders={cardholders}
          isBank={isBank}
          defaultRewardType={defaultRewardType}
          defaultPriority={(rules.length ? Math.max(...rules.map((r) => r.priority)) : 0) + 1}
          onClose={() => setOpen(null)}
          onDelete={editing && open.mode === 'edit' ? () => setDeleting(editing) : undefined}
          onClone={editing && open.mode === 'edit' ? () => setOpen({ mode: 'clone', rule: editing }) : undefined}
          onEndAndClone={
            editing && open.mode === 'edit' && !isEnded(editing, today) ? () => endAndClone(editing) : undefined
          }
        />
      ) : null}

      {reordering ? <ReorderRulesDialog accountId={accountId} rules={rules} onClose={() => setReordering(false)} /> : null}
      {testing ? (
        <TestTransactionDialog accountId={accountId} categories={categories} today={today} onClose={() => setTesting(false)} />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => (o ? undefined : setDeleting(null))}
        title={`Delete rule "${deleting?.name ?? ''}"?`}
        description="Historical reports will no longer see it. Your transactions stay."
        confirmLabel="Delete rule"
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </Card>
  );
}
