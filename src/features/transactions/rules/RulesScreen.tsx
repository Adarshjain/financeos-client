'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { FilterBar } from '@/components/ds/FilterBar/FilterBar';
import { Pager } from '@/components/ds/Pager/Pager';
import { type SelectOption } from '@/components/ds/Select/Select';
import { RuleCard } from '@/components/organisms/RuleCard/RuleCard';
import { LoadError } from '@/features/shell/LoadError';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';
import { useSearchText } from '@/features/shell/useSearchText';
import type { CategoryDef } from '@/lib/categoryList.types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import type { CategoryRule } from '@/lib/rules.types';

import { ChoiceChip } from '../list/FilterChips';
import { TransactionsTabs } from '../TransactionsTabs';
import { RuleJobsCard } from './RuleJobsCard';
import {
  ANY,
  DEFAULT_RULES_STATE,
  hasRuleFilters,
  MATCH_FILTER_OPTIONS,
  MATCH_TYPE_LABEL,
  ruleCategoryLabel,
  ruleMatchLine,
  ruleName,
  RULES_SIZE_OPTIONS,
  rulesUrl,
  type RulesUrlState,
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
  /** The fixed category list, for the Category filter and the rule form; null when it could not be loaded. */
  categoryList: CategoryDef[] | null;
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

/** /transactions/rules: the Tags tab (the rules still live here until its rebuild). Add from the top bar's +; Find matches, Edit and Delete from a rule's ⋮. */
export function RulesScreen({ rules, reference, state, categoryList }: RulesScreenProps) {
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
  const { remove } = useRuleMutations({
    onDeleted: () => setDialog(null),
  });

  const go = (patch: Partial<RulesUrlState>, resetPage = true) =>
    router.push(rulesUrl({ ...state, ...(resetPage ? { page: 0 } : {}), ...patch }), { scroll: false });
  const { text, setText } = useSearchText(state.q, (q) => go({ q }));

  const categoryOptions: SelectOption[] = [
    { value: ANY, label: 'Any category' },
    ...[...(categoryList ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.key, label: c.name })),
  ];
  const categoryName = categoryList?.find((c) => c.key === state.categoryKey)?.name;

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

  const noMatch = hasRuleFilters(state);

  return (
    <ShellPage crumb={subCrumb('transactions')} title="Tags" flushTop onAdd={() => openDialog({ kind: 'add' })} addLabel="Add rule">
      <div className="flex min-w-0 flex-col gap-space-8 desk:gap-space-16">
        <TransactionsTabs />
        <FilterBar
          size="md"
          search={{ value: text, onValueChange: setText }}
          changed={state.matchType !== null || state.categoryKey !== null}
          onReset={() => go({ ...DEFAULT_RULES_STATE, q: state.q, size: state.size })}
        >
            <ChoiceChip
              label={categoryName ?? 'Category'}
              onReset={() => go({ categoryKey: null })}
              value={state.categoryKey ?? ANY}
              options={categoryOptions}
              selected={state.categoryKey !== null}
              searchPlaceholder="Search categories"
              onCommit={(v) => go({ categoryKey: v === ANY ? null : v })}
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
                : 'A rule sets the category of transactions whose description matches it. Add one to get started.'
            }
            action={
              hasRuleFilters(state)
                ? {
                    label: 'Clear filters',
                    variant: 'secondary',
                    onSelect: () => go({ ...DEFAULT_RULES_STATE, size: state.size }),
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
                    tone="success"
                    mcc={rule.mcc ? `MCC ${rule.mcc}` : undefined}
                    categories={[ruleCategoryLabel(rule)]}
                    menuItems={[
                      { label: 'Edit', onSelect: () => openDialog({ kind: 'edit', rule }) },
                      { label: 'Find matches', onSelect: () => openDialog({ kind: 'matches', rule }) },
                      { label: 'Delete', tone: 'danger', onSelect: () => setDialog({ kind: 'delete', rule }) },
                    ]}
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

      {dialog?.kind === 'add' && RuleDialog ? <RuleDialog categoryList={categoryList} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'edit' && RuleDialog ? <RuleDialog key={dialog.rule.id} rule={dialog.rule} categoryList={categoryList} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'matches' && FindMatchesDialog ? <FindMatchesDialog key={dialog.rule.id} rule={dialog.rule} onClose={() => setDialog(null)} /> : null}
      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setDialog(null);
        }}
        title="Delete rule?"
        description="Transactions it categorized go back to your links and the built-in engine. This can't be undone."
        confirmLabel="Delete"
        confirmLoading={remove.isPending}
        onConfirm={() => {
          if (dialog?.kind === 'delete') remove.mutate(dialog.rule);
        }}
      />
    </ShellPage>
  );
}
