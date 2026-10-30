'use client';

import React from 'react';

import { Checkbox } from '@/components/ds/Checkbox/Checkbox';
import { Select } from '@/components/ds/Select/Select';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import { CHANNEL_OPTIONS } from '@/features/rewards/rules/form/constants';
import type { useRewardRuleForm } from '@/features/rewards/rules/form/useRewardRuleForm';
import type { Category } from '@/lib/categories.types';
import type { TransactionChannel } from '@/lib/transaction.types';
import { sanitizeDecimalInput } from '@/lib/utils';

import { readRuleTest } from './ruleTestReadingModel';

const NONE = 'NONE';
const asList = (v: string | string[]): string[] => (Array.isArray(v) ? v : v ? [v] : []);

/** The rule dialog's own tester: one purchase run against the rule as it is being typed, in the browser. */
export function RuleTester({ f, categories }: { f: ReturnType<typeof useRewardRuleForm>; categories: Category[] }) {
  const reading = f.preview ? readRuleTest(f.preview, f) : null;
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-12">
      <div className="grid grid-cols-1 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12 desk:grid-cols-2">
        <TextField
          label="Amount ₹"
          inputMode="decimal"
          value={f.previewAmount}
          onValueChange={(v) => f.setPreviewAmount(sanitizeDecimalInput(v))}
        />
        <TextField
          label="Description"
          placeholder="e.g. SWIGGY BANGALORE"
          value={f.previewDescription}
          onValueChange={f.setPreviewDescription}
        />
        <div className="grid grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12 desk:col-span-2">
            <TextField
              label="MCC"
              inputMode="numeric"
              maxLength={4}
              placeholder="e.g. 5812"
              value={f.previewMcc}
              onValueChange={(v) => f.setPreviewMcc(v.replace(/\D/g, ''))}
            />
            <Select
              label="Channel"
              options={[{ value: NONE, label: 'Not set' }, ...CHANNEL_OPTIONS]}
              value={f.previewChannel}
              onValueChange={(v) => f.setPreviewChannel((asList(v)[0] ?? NONE) as TransactionChannel | 'NONE')}
            />
        </div>
        <Select
          className="desk:col-span-2"
          label="Categories"
          multiple
          searchable
          placeholder="None"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          value={f.previewCategories.map((c) => c.id)}
          onValueChange={(v) => f.setPreviewCategories(asList(v).flatMap((id) => categories.find((c) => c.id === id) ?? []))}
        />
      </div>
      <div className="flex flex-wrap gap-x-space-16 gap-y-space-8 desk:gap-y-space-16">
        <label className="flex items-center gap-space-8">
          <Checkbox checked={f.previewEmi} onCheckedChange={(c) => f.setPreviewEmi(c === true)} />
          <Text variant="body">EMI</Text>
        </label>
        <label className="flex items-center gap-space-8">
          <Checkbox checked={f.previewIntl} onCheckedChange={(c) => f.setPreviewIntl(c === true)} />
          <Text variant="body">International</Text>
        </label>
      </div>
      {reading ? (
        <div className="flex flex-col gap-space-4">
          {reading.headline ? (
            <Text variant="figure" tone={reading.tone} as="p">
              {reading.headline}
            </Text>
          ) : null}
          <Text variant="body-strong" tone={reading.headline ? 'ink-3' : reading.tone} as="p">
            {reading.verdict}
          </Text>
        </div>
      ) : (
        <Text variant="body-strong" tone="ink-3" as="p">
          Enter an amount (and accrual fields) to test.
        </Text>
      )}
      {f.daysOfWeek.length > 0 ? (
        <Text variant="caption" tone="ink-3" as="p">
          Note: this rule has day-of-week conditions, which the tester doesn’t simulate. Caps aren’t simulated either.
        </Text>
      ) : null}
    </div>
  );
}
