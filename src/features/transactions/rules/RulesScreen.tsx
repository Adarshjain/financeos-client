'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import {
  ConfirmDialog,
  EmptyState,
  FilterBar,
  FilterChip,
  Icon,
  Pager,
  SelectionBar,
  type SelectOption,
  type TabItem,
  Tabs,
} from '@/components/ds';
import { ErrorState, RuleCard } from '@/components/organisms';
import { appHref } from '@/features/shell/routes';
import { ShellPage } from '@/features/shell/ShellPage';
import { useSearchText } from '@/features/shell/useSearchText';
import type { Category } from '@/lib/categories.types';
import type { CategoryRule } from '@/lib/rules.types';

import { ChoiceChip } from '../list/FilterChips';
import { TRANSACTION_TABS } from '../list/TransactionsView';
import { FindMatchesDialog } from './FindMatchesDialog';
import { RuleDialog } from './RuleDialog';
import { RuleJobsCard } from './RuleJobsCard';
import {
  ANY,
  DEFAULT_RULES_STATE,
  hasRuleFilters,
  MATCH_FILTER_OPTIONS,
  MATCH_TYPE_LABEL,
  ruleMatchLine,
  ruleName,
  RULES_SIZE_OPTIONS,
  rulesFilterKey,
  type RuleSource,
  type RuleStatus,
  rulesUrl,
  type RulesUrlState,
  SOURCE_LABEL,
  SOURCE_OPTIONS,
} from './rulesModel';
import { useRuleMutations } from './useRuleMutations';

export interface RulesPage {
  rows: CategoryRule[];
  totalElements: number;
  totalPages: number;
}

export interface RulesScreenProps {
  /** The page of rules the address asks for; null when it could not be loaded. */
  rules: RulesPage | null;
  reference?: string;
  state: RulesUrlState;
  /** Null when they could not be loaded: the Category chip is then off. */
  categories: Category[] | null;
}

type Dialogs =
  | { kind: 'add' }
  | { kind: 'edit'; rule: CategoryRule }
  | { kind: 'matches'; rule: CategoryRule }
  | { kind: 'delete'; rule: CategoryRule }
  | null;

const STATUS_CHIPS: { id: RuleStatus; label: string }[] = [
  { id: 'unverified', label: 'Unverified' },
  { id: 'verified', label: 'Verified' },
  { id: 'all', label: 'All' },
];

/** /transactions/rules: the Rules tab. Add from the top bar's +; Find matches, Edit and Delete from a rule's ⋮. */
export function RulesScreen({ rules, reference, state, categories }: RulesScreenProps) {
  const router = useRouter();
  const [dialog, setDialog] = React.useState<Dialogs>(null);
  const [picked, setPicked] = React.useState<{ key: string; ids: string[] }>({ key: '', ids: [] });
  const filterKey = rulesFilterKey(state);
  // The ticked rules survive paging; another status, filter or search starts from none.
  const ids = picked.key === filterKey ? picked.ids : [];
  const setIds = (next: string[]) => setPicked({ key: filterKey, ids: next });
  const forget = (gone: string[]) => setIds(ids.filter((id) => !gone.includes(id)));
  const { remove, verify, verifyMany } = useRuleMutations({
    onDeleted: (id) => {
      forget([id]);
      setDialog(null);
    },
    onVerified: forget,
  });

  const go = (patch: Partial<RulesUrlState>, resetPage = true) =>
    router.push(rulesUrl({ ...state, ...(resetPage ? { page: 0 } : {}), ...patch }), { scroll: false });
  const { text, setText } = useSearchText(state.q, (q) => go({ q }));

  const tabs: TabItem[] = TRANSACTION_TABS.map((t) => ({
    value: t.value,
    label: t.label,
    asChild: true,
    children: <Link href={appHref(t.href)} prefetch={false} />,
  }));

  const categoryOptions: SelectOption[] = [
    { value: ANY, label: 'Any category' },
    ...[...(categories ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name })),
  ];
  const categoryName = categories?.find((c) => c.id === state.categoryId)?.name;

  const pager = rules ? (
      <Pager
        page={state.page}
        size={state.size}
        totalElements={rules.totalElements}
        totalPages={rules.totalPages}
        unit="rules"
        borderPosition="none"
        sizeOptions={RULES_SIZE_OPTIONS}
        sizeLabel={(n) => `${n} / page`}
        onPageChange={(page) => go({ page }, false)}
        onSizeChange={(size) => go({ size })}
      />
  ) : null;

  const pageSelectable = rules?.rows.filter((r) => !r.verified).map((r) => r.id) ?? [];
  const allOnPage = pageSelectable.length > 0 && pageSelectable.every((id) => ids.includes(id));

  return (
    <ShellPage crumb="Money / Transactions" title="Rules" flushTop onAdd={() => setDialog({ kind: 'add' })}>
      <div className="flex min-w-0 flex-col gap-space-8 desk:gap-space-16">
        <Tabs items={tabs} value="rules" />
        <FilterBar size="md"
          search={{ value: text, onValueChange: setText }}
        >
          {STATUS_CHIPS.map((chip) => (
            <FilterChip
              key={chip.id}
              size="md"
              className="shrink-0"
              selected={state.status === chip.id}
              onSelectedChange={(on) => {
                if (on) go({ status: chip.id });
              }}
            >
              {chip.label}
            </FilterChip>
          ))}
            <ChoiceChip
              label={categoryName ? `Category · ${categoryName}` : 'Category'}
              value={state.categoryId ?? ANY}
              options={categoryOptions}
              selected={state.categoryId !== null}
              searchPlaceholder="Search categories"
              onCommit={(v) => go({ categoryId: v === ANY ? null : v })}
            />
            <ChoiceChip
              label={state.source ? `Source · ${SOURCE_LABEL[state.source]}` : 'Source'}
              value={state.source ?? ANY}
              options={SOURCE_OPTIONS}
              selected={state.source !== null}
              onCommit={(v) => go({ source: v === ANY ? null : (v as RuleSource) })}
            />
            <ChoiceChip
              label={state.matchType ? `Match type · ${MATCH_TYPE_LABEL[state.matchType]}` : 'Match type'}
              value={state.matchType ?? ANY}
              options={MATCH_FILTER_OPTIONS}
              selected={state.matchType !== null}
              onCommit={(v) => go({ matchType: v === ANY ? null : (v as RulesUrlState['matchType']) })}
            />
        </FilterBar>
        {rules === null ? (
          <ErrorState
            title="Could not load rules"
            description="The rules request failed. Try again, and quote the reference if it keeps failing."
            action={{ label: 'Try again', onSelect: () => router.refresh() }}
            reference={reference}
          />
        ) : rules.rows.length === 0 ? (
          <EmptyState
            title="No rules found"
            description={
              hasRuleFilters(state)
                ? 'Try adjusting your search or filters.'
                : 'Transactions you import will generate rules automatically, or add one with the + at the top.'
            }
            action={
              hasRuleFilters(state)
                ? {
                    label: 'Clear filters',
                    variant: 'secondary',
                    onSelect: () => go({ ...DEFAULT_RULES_STATE, status: state.status, size: state.size }),
                  }
                : undefined
            }
          />
        ) : (
          <>
            {pager}
            <div className="grid grid-cols-1 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12 desk:grid-cols-3">
              {rules.rows.map((rule) => {
                const line = ruleMatchLine(rule);
                return (
                  <RuleCard
                    key={rule.id}
                    name={ruleName(rule)}
                    matchType={line.matchType}
                    pattern={line.pattern}
                    usedCount={rule.appliedCount}
                    status={rule.verified ? 'verified' : 'unverified'}
                    source={SOURCE_LABEL[rule.source]}
                    mcc={rule.mcc ? `MCC ${rule.mcc}` : undefined}
                    categories={rule.categories.map((c) => c.name)}
                    onApprove={() => verify.mutate(rule)}
                    menuItems={[
                      { label: 'Find matches', onSelect: () => setDialog({ kind: 'matches', rule }) },
                      { label: 'Edit rule', onSelect: () => setDialog({ kind: 'edit', rule }) },
                      { label: 'Delete rule', destructive: true, onSelect: () => setDialog({ kind: 'delete', rule }) },
                    ]}
                    selectable={!rule.verified}
                    selected={ids.includes(rule.id)}
                    onSelectedChange={(on) => setIds(on ? [...ids, rule.id] : ids.filter((id) => id !== rule.id))}
                    selectionMode={ids.length > 0}
                    onDetail={() => setDialog({ kind: 'edit', rule })}
                  />
                );
              })}
            </div>
            {pager}
          </>
        )}
        <RuleJobsCard />
      </div>

      <SelectionBar
        className="fixed inset-x-0 bottom-0 desk:bottom-safe-12"
        count={ids.length}
        summary="unverified rules"
        onClear={() => setIds([])}
        onSelectAll={allOnPage ? undefined : () => setIds([...new Set([...ids, ...pageSelectable])])}
        selectAllLabel="Select all on page"
        actions={[
          {
            id: 'approve',
            label: 'Approve',
            hint: 'mark verified',
            icon: <Icon name="check" size="lg" />,
            count: ids.length,
            disabled: verifyMany.isPending,
            onSelect: () => verifyMany.mutate(ids),
          },
        ]}
      />

      {dialog?.kind === 'add' ? <RuleDialog categories={categories} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'edit' ? <RuleDialog key={dialog.rule.id} rule={dialog.rule} categories={categories} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'matches' ? <FindMatchesDialog key={dialog.rule.id} rule={dialog.rule} onClose={() => setDialog(null)} /> : null}
      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setDialog(null);
        }}
        title="Delete rule?"
        description="Transactions already categorized by this rule keep their categories."
        confirmLabel="Delete rule"
        confirmLoading={remove.isPending}
        onConfirm={() => {
          if (dialog?.kind === 'delete') remove.mutate(dialog.rule);
        }}
      />
    </ShellPage>
  );
}
