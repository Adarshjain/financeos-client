'use client';

import React from 'react';

import { Dialog, DialogBody, DialogContent, Select, TextField } from '@/components/ds';
import type { Category } from '@/lib/categories.types';
import { useCategories } from '@/lib/query/hooks/useCategories';
import { MATCH_TYPE_META } from '@/lib/rules.matchTypes';
import type { CategoryRule, MatchType } from '@/lib/rules.types';
import { validatePattern } from '@/lib/rules.validate';

import { CategoriesField } from '../form/CategoriesField';
import { isValidMcc } from '../form/mcc';
import { useCategorySuggestions } from '../form/useCategorySuggestions';
import { RuleMatchesPreview } from './RuleMatchesPreview';
import { MATCH_TYPE_OPTIONS, ruleName } from './rulesModel';
import { useRuleMutations } from './useRuleMutations';

const FORM_ID = 'rule-form';
const NO_CATEGORIES: Category[] = [];
const noop = () => undefined;

export interface RuleDialogProps {
  /** The rule being edited; without it the dialog adds one. */
  rule?: CategoryRule;
  /** The categories the page already loaded; the dialog keeps them current. */
  categories: Category[] | null;
  /** Cancelled, or saved. */
  onClose: () => void;
}

interface Problems {
  pattern?: string;
  categories?: string;
  mcc?: string;
}

/** Add rule and Edit rule: one form. The matches it would give show underneath and follow the pattern. */
export function RuleDialog({ rule, categories: initialCategories, onClose }: RuleDialogProps) {
  const { data: allCategories = NO_CATEGORIES } = useCategories(initialCategories ?? undefined);
  const { create, update } = useRuleMutations({ onSaved: onClose });
  const [pattern, setPattern] = React.useState(rule?.merchantKey ?? '');
  const [matchType, setMatchType] = React.useState<MatchType>(rule?.matchType ?? 'MERCHANT_KEY');
  const [displayName, setDisplayName] = React.useState(rule?.displayName ?? '');
  const [mcc, setMcc] = React.useState(rule?.mcc ?? '');
  const [problems, setProblems] = React.useState<Problems>({});
  const { localCategories, selectedCategories, setSelectedCategories, creatingCategory, createCategory } =
    useCategorySuggestions({
      categories: allCategories,
      initialSelectedCategories: rule?.categories ?? NO_CATEGORIES,
      isUpdateMode: true,
      onMccSuggested: noop,
    });
  const saving = create.isPending || update.isPending;

  const submit = () => {
    const found: Problems = {
      pattern: validatePattern(matchType, pattern) ?? undefined,
      categories: selectedCategories.length === 0 ? 'Pick at least one category.' : undefined,
      mcc: isValidMcc(mcc) ? undefined : 'MCC code must be exactly 4 digits, or left empty.',
    };
    setProblems(found);
    if (found.pattern || found.categories || found.mcc) return;
    const categoryIds = selectedCategories.map((c) => c.id);
    if (rule) {
      update.mutate({
        id: rule.id,
        body: {
          merchantKey: pattern.trim(),
          matchType,
          displayName: displayName.trim() || undefined,
          categoryIds,
          mcc: mcc.trim(),
        },
      });
    } else {
      create.mutate({
        merchantKey: pattern.trim(),
        matchType,
        displayName: displayName.trim() || undefined,
        categoryIds,
        mcc: mcc.trim() || undefined,
      });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open || saving ? undefined : onClose())}>
      <DialogContent
        size="lg"
        title={rule ? `Edit rule · ${ruleName(rule)}` : 'Add rule'}
        description={
          rule && rule.appliedCount > 0
            ? `Changing the pattern unlinks the ${rule.appliedCount} ${rule.appliedCount === 1 ? 'transaction' : 'transactions'} it categorized; they keep their category.`
            : undefined
        }
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: saving }}
        primary={{ label: 'Save', type: 'submit', form: FORM_ID, loading: saving, disabled: saving || creatingCategory }}
      >
        <DialogBody>
          <form
            id={FORM_ID}
            className="flex flex-col gap-space-12"
            onSubmit={(e) => {
              e.preventDefault();
              if (!saving) submit();
            }}
          >
            <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-2">
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
            <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-2">
              <CategoriesField
                categories={localCategories}
                selectedCategoryIds={selectedCategories.map((c) => c.id)}
                creating={creatingCategory}
                onChange={(ids) =>
                  setSelectedCategories(ids.map((id) => localCategories.find((c) => c.id === id)).filter((c) => c !== undefined))
                }
                onCreate={(name) => void createCategory(name)}
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
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
