'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { FilterBar } from '@/components/ds/FilterBar/FilterBar';
import { Icon } from '@/components/ds/Icon/Icon';
import { Pager } from '@/components/ds/Pager/Pager';
import { type SelectOption } from '@/components/ds/Select/Select';
import { SelectionBar } from '@/components/ds/SelectionBar/SelectionBar';
import { RuleCard } from '@/components/organisms/RuleCard/RuleCard';
import { LoadError } from '@/features/shell/LoadError';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';
import { useSearchText } from '@/features/shell/useSearchText';
import type { Category } from '@/lib/categories.types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import type { CategoryRule } from '@/lib/rules.types';

import { ChoiceChip } from '../list/FilterChips';
import { TransactionsTabs } from '../TransactionsTabs';
import { RuleJobsCard } from './RuleJobsCard';
import {
  ANY,
  DEFAULT_RULES_STATE,
  DEFAULT_STATUS,
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
  /** An empty status tab while other tabs hold rules: it says nothing matches, not "No rules yet". */
  hasRulesElsewhere?: boolean;
  /** Null when they could not be loaded: the Category chip is then off. */
  categories: Category[] | null;
}

// The rule editor and Find matches are not in the page: each loads when pressed (see useLazyDialog).
const loadRuleDialog = () => import('./RuleDialog').then((m) => m.RuleDialog);
const loadFindMatchesDialog = () => import('./FindMatchesDialog').then((m) => m.FindMatchesDialog);

type Dialogs =
  | { kind: 'add' }
  | { kind: 'edit'; rule: CategoryRule }
  | { kind: 'matches'; rule: CategoryRule }
  | { kind: 'delete'; rule: CategoryRule }
  | null;

const STATUS_LABEL: Record<RuleStatus, string> = { unverified: 'Unverified', verified: 'Verified', all: 'All' };
const STATUS_OPTIONS: SelectOption[] = (['unverified', 'verified', 'all'] as const).map((value) => ({
  value,
  label: STATUS_LABEL[value],
}));

/** /transactions/rules: the Rules tab. Add from the top bar's +; Find matches, Edit and Delete from a rule's ⋮. */
export function RulesScreen({ rules, reference, state, categories, hasRulesElsewhere = false }: RulesScreenProps) {
  const router = useRouter();
  const [dialog, setDialog] = React.useState<Dialogs>(null);
  const { Component: RuleDialog, run: runRule } = useLazyDialog(loadRuleDialog);
  const { Component: FindMatchesDialog, run: runMatches } = useLazyDialog(loadFindMatchesDialog);
  // The rule editor and Find matches load when pressed; Delete is a small confirm and opens at once.
  const openDialog = (next: NonNullable<Dialogs>) => {
    if (next.kind === 'add' || next.kind === 'edit') void runRule(() => setDialog(next));
    else if (next.kind === 'matches') void runMatches(() => setDialog(next));
    else setDialog(next);
  };
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

  const noMatch = hasRuleFilters(state) || hasRulesElsewhere;
  const pageSelectable = rules?.rows.filter((r) => !r.verified).map((r) => r.id) ?? [];
  const allOnPage = pageSelectable.length > 0 && pageSelectable.every((id) => ids.includes(id));

  return (
    <ShellPage crumb={subCrumb('transactions')} title="Rules" flushTop onAdd={() => openDialog({ kind: 'add' })} addLabel="Add rule">
      <div className="flex min-w-0 flex-col gap-space-8 desk:gap-space-16">
        <TransactionsTabs />
        <FilterBar
          size="md"
          search={{ value: text, onValueChange: setText }}
          changed={state.status !== DEFAULT_STATUS || state.source !== null || state.matchType !== null || state.categoryId !== null}
          onReset={() => go({ ...DEFAULT_RULES_STATE, q: state.q, size: state.size })}
        >
          <ChoiceChip
            label={STATUS_LABEL[state.status]}
            value={state.status}
            options={STATUS_OPTIONS}
            selected={state.status !== DEFAULT_STATUS}
            onReset={() => go({ status: DEFAULT_STATUS })}
            onCommit={(v) => go({ status: v as RuleStatus })}
          />
            <ChoiceChip
              label={categoryName ?? 'Category'}
              onReset={() => go({ categoryId: null })}
              value={state.categoryId ?? ANY}
              options={categoryOptions}
              selected={state.categoryId !== null}
              searchPlaceholder="Search categories"
              onCommit={(v) => go({ categoryId: v === ANY ? null : v })}
            />
            <ChoiceChip
              label={state.source ? SOURCE_LABEL[state.source] : 'Source'}
              onReset={() => go({ source: null })}
              value={state.source ?? ANY}
              options={SOURCE_OPTIONS}
              selected={state.source !== null}
              onCommit={(v) => go({ source: v === ANY ? null : (v as RuleSource) })}
            />
            <ChoiceChip
              label={state.matchType ? MATCH_TYPE_LABEL[state.matchType] : 'Match type'}
              onReset={() => go({ matchType: null })}
              value={state.matchType ?? ANY}
              options={MATCH_FILTER_OPTIONS}
              selected={state.matchType !== null}
              onCommit={(v) => go({ matchType: v === ANY ? null : (v as RulesUrlState['matchType']) })}
            />
        </FilterBar>
        {rules === null ? (
          <LoadError what="rules" reference={reference} />
        ) : rules.rows.length === 0 ? (
          <EmptyState
            title={noMatch ? 'No rules match' : 'No rules yet'}
            description={
              noMatch
                ? 'Try adjusting your search or filters.'
                : 'Transactions you import will generate rules automatically, or add one yourself.'
            }
            action={
              hasRuleFilters(state)
                ? {
                    label: 'Clear filters',
                    variant: 'secondary',
                    onSelect: () => go({ ...DEFAULT_RULES_STATE, status: state.status, size: state.size }),
                  }
                : noMatch
                  ? undefined
                  : { label: 'Add rule', onSelect: () => openDialog({ kind: 'add' }) }
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
                    tone={rule.verified ? 'success' : 'warning'}
                    source={SOURCE_LABEL[rule.source]}
                    mcc={rule.mcc ? `MCC ${rule.mcc}` : undefined}
                    categories={rule.categories.map((c) => c.name)}
                    onApprove={() => verify.mutate(rule)}
                    menuItems={[
                      { label: 'Edit', onSelect: () => openDialog({ kind: 'edit', rule }) },
                      { label: 'Find matches', onSelect: () => openDialog({ kind: 'matches', rule }) },
                      { label: 'Delete', tone: 'danger', onSelect: () => setDialog({ kind: 'delete', rule }) },
                    ]}
                    selectable={!rule.verified}
                    selected={ids.includes(rule.id)}
                    onSelectedChange={(on) => setIds(on ? [...ids, rule.id] : ids.filter((id) => id !== rule.id))}
                    selectionMode={ids.length > 0}
                    onOpenDetail={() => openDialog({ kind: 'edit', rule })}
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

      {dialog?.kind === 'add' && RuleDialog ? <RuleDialog categories={categories} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'edit' && RuleDialog ? <RuleDialog key={dialog.rule.id} rule={dialog.rule} categories={categories} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'matches' && FindMatchesDialog ? <FindMatchesDialog key={dialog.rule.id} rule={dialog.rule} onClose={() => setDialog(null)} /> : null}
      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setDialog(null);
        }}
        title="Delete rule?"
        description="Transactions already categorized by this rule keep their categories. This can't be undone."
        confirmLabel="Delete"
        confirmLoading={remove.isPending}
        onConfirm={() => {
          if (dialog?.kind === 'delete') remove.mutate(dialog.rule);
        }}
      />
    </ShellPage>
  );
}
