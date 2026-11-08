'use client';

import React from 'react';

import { Checkbox } from '@/components/ds/Checkbox/Checkbox';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import type { IconName } from '@/components/ds/Icon/registry';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Select } from '@/components/ds/Select/Select';
import { TextField } from '@/components/ds/TextField/TextField';
import { CategoryPicker } from '@/components/organisms/CategoryPicker/CategoryPicker';
import { useDiscardGuard } from '@/features/shell/useDiscardGuard';
import { categoryLabel, findCategory, findSub } from '@/lib/categoryList';
import type { CategoryDef, CategoryPick } from '@/lib/categoryList.types';
import { formatCount } from '@/lib/format';
import { useCategoryList } from '@/lib/query/hooks/useCategoryList';
import { useCategoryRecent } from '@/lib/query/hooks/useCategoryRecent';
import { MATCH_TYPE_META } from '@/lib/rules.matchTypes';
import type { CategoryRule, MatchType } from '@/lib/rules.types';
import { validatePattern } from '@/lib/rules.validate';

import { CategoryField } from '../form/CategoryField';
import { isValidMcc } from '../form/mcc';
import { RuleMatchesPreview } from './RuleMatchesPreview';
import { MATCH_TYPE_OPTIONS, ruleName } from './rulesModel';
import { useRuleMutations } from './useRuleMutations';

const FORM_ID = 'rule-form';

export interface RuleDialogProps {
  /** The rule being edited; without it the dialog adds one. */
  rule?: CategoryRule;
  /** The fixed category list the page already loaded. */
  categoryList: CategoryDef[] | null;
  /** Cancelled, or saved. */
  onClose: () => void;
}

interface Problems {
  pattern?: string;
  categories?: string;
  mcc?: string;
}

/** Add rule and Edit rule: one form. The matches it would give show underneath and follow the pattern. */
export function RuleDialog({ rule, categoryList, onClose }: RuleDialogProps) {
  const { list } = useCategoryList(categoryList ?? undefined);
  const [alsoApply, setAlsoApply] = React.useState(false);
  const { create, update, applyToPast } = useRuleMutations({
    onSaved: (saved) => {
      // "Also update past matches": the job starts after the save, so it runs on the rule as saved.
      const id = saved?.id ?? rule?.id;
      if (alsoApply && id) applyToPast.mutate(id);
      onClose();
    },
  });
  const [pattern, setPattern] = React.useState(rule?.merchantKey ?? '');
  const [matchType, setMatchType] = React.useState<MatchType>(rule?.matchType ?? 'CONTAINS');
  const [displayName, setDisplayName] = React.useState(rule?.displayName ?? '');
  const [mcc, setMcc] = React.useState(rule?.mcc ?? '');
  const [problems, setProblems] = React.useState<Problems>({});
  const opened: CategoryPick | null = rule
    ? { categoryKey: rule.category.key, subcategoryKey: rule.subcategory?.key ?? null }
    : null;
  const [category, setCategory] = React.useState<CategoryPick | null>(opened);
  const [picking, setPicking] = React.useState(false);
  const recent = useCategoryRecent('ANY', picking);
  const categoryDef = findCategory(list, category?.categoryKey);
  const categoryText = categoryDef ? categoryLabel(categoryDef.name, findSub(categoryDef, category?.subcategoryKey)?.name) : '';
  const saving = create.isPending || update.isPending;
  const dirty =
    pattern !== (rule?.merchantKey ?? '') ||
    matchType !== (rule?.matchType ?? 'CONTAINS') ||
    displayName !== (rule?.displayName ?? '') ||
    mcc !== (rule?.mcc ?? '') ||
    category?.categoryKey !== opened?.categoryKey ||
    (category?.subcategoryKey ?? null) !== (opened?.subcategoryKey ?? null);
  const guard = useDiscardGuard({ dirty, onClose });

  const submit = () => {
    if (saving) return;
    const found: Problems = {
      pattern: validatePattern(matchType, pattern) ?? undefined,
      categories: category ? undefined : 'Pick a category.',
      mcc: isValidMcc(mcc) ? undefined : 'MCC code must be exactly 4 digits, or left empty.',
    };
    setProblems(found);
    if (found.pattern || found.categories || found.mcc) return;
    if (rule) {
      update.mutate({
        id: rule.id,
        body: {
          merchantKey: pattern.trim(),
          matchType,
          displayName: displayName.trim() || undefined,
          categoryKey: category!.categoryKey,
          subcategoryKey: category!.subcategoryKey,
          mcc: mcc.trim(),
        },
      });
    } else {
      create.mutate({
        merchantKey: pattern.trim(),
        matchType,
        displayName: displayName.trim() || undefined,
        categoryKey: category!.categoryKey,
        subcategoryKey: category!.subcategoryKey,
        mcc: mcc.trim() || undefined,
      });
    }
  };

  return (
    <>
    <Dialog open onOpenChange={(open) => (open || saving ? undefined : guard.requestClose())}>
      <Dialog.Content
        size="lg"
        title={rule ? `Edit rule · ${ruleName(rule)}` : 'Add rule'}
        description={
          rule && rule.appliedCount > 0
            ? `Changing the pattern unlinks the ${formatCount(rule.appliedCount, ['transaction', 'transactions'])} it categorized; they keep their category.`
            : undefined
        }
        secondary={{ label: 'Cancel', onSelect: guard.requestClose, disabled: saving }}
        primary={{ label: rule ? 'Save rule' : 'Add rule', type: 'submit', form: FORM_ID, loading: saving, disabled: saving }}
      >
        <Dialog.Body>
          <form
            id={FORM_ID}
            className="flex flex-col gap-space-8 desk:gap-space-12"
            onSubmit={(e) => {
              e.preventDefault();
              if (!saving) submit();
            }}
          >
            <div className="grid grid-cols-1 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12 desk:grid-cols-2">
              <TextField
                label="Pattern"
                name="pattern"
                placeholder={MATCH_TYPE_META[matchType].placeholder}
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                error={problems.pattern}
              />
              <Select
                label="Match"
                options={MATCH_TYPE_OPTIONS}
                value={matchType}
                onValueChange={(v) => setMatchType(v as MatchType)}
              />
            </div>
            <div className="grid grid-cols-1 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12 desk:grid-cols-2">
              <CategoryField
                label={categoryText || undefined}
                icon={categoryDef?.icon as IconName | undefined}
                onOpen={() => setPicking(true)}
                error={problems.categories}
              />
              <TextField
                label="MCC code"
                optional
                name="mcc"
                inputMode="numeric"
                maxLength={4}
                placeholder="e.g. 5411"
                value={mcc}
                onValueChange={(v) => setMcc(v.replace(/\D/g, ''))}
                error={problems.mcc}
              />
            </div>
            <TextField
              label="Display name"
              optional
              name="displayName"
              placeholder="e.g. Swiggy"
              helper="Shown instead of the bank text on matched rows."
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <RuleMatchesPreview matchType={matchType} pattern={pattern} ruleId={rule?.id} />
            <ListRow
              clickable
              flush
              onClick={() => setAlsoApply((now) => !now)}
              leading={<Checkbox checked={alsoApply} tabIndex={-1} aria-hidden="true" />}
              title="Also update past matches"
            />
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
    <CategoryPicker
      open={picking}
      onOpenChange={setPicking}
      categories={list as CategoryDef[]}
      direction="ANY"
      recent={recent}
      value={category}
      subtitle={pattern.trim() || undefined}
      onPick={setCategory}
    />
    {guard.node}
    </>
  );
}
