'use client';

import React from 'react';

import { Button, Checkbox,DateField, Dialog, DialogBody, DialogContent, Reveal, Select, showToast, Text, TextField } from '@/components/ds';
import { AmountField } from '@/components/organisms';
import { useRecommendCards } from '@/features/rewards/queries/useRewardRecommendMutation';
import { BreakdownContent } from '@/features/rewards/which-card/WhichCardBreakdownDialog';
import {
  ANY,
  breakdown,
  buildRequest,
  CHANNEL_OPTIONS,
  initialForm,
  type WhichCardForm,
} from '@/features/rewards/which-card/whichCardModel';
import { amountExpressionProps } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';

const asList = (v: string | string[]): string[] => (Array.isArray(v) ? v : v ? [v] : []);

export interface TestTransactionDialogProps {
  accountId: string;
  categories: { id: string; name: string }[];
  today: string;
  onClose: () => void;
}

/**
 * Test a transaction: one purchase run through this card's rules with its real cap usage, through the same recommender
 * Which card? uses, narrowed to this card. The result shows each rule's outcome the way Which card? does.
 */
export function TestTransactionDialog({ accountId, categories, today, onClose }: TestTransactionDialogProps) {
  const recommend = useRecommendCards();
  const [form, setForm] = React.useState<WhichCardForm>(() => ({ ...initialForm(today), accountIds: [accountId] }));
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [amountError, setAmountError] = React.useState<string | null>(null);
  const patch = (next: Partial<WhichCardForm>) => setForm((f) => ({ ...f, ...next }));
  const card = recommend.data?.recommendations[0];

  const run = () => {
    const built = buildRequest({ ...form, moreCategoryIds: [], accountIds: [accountId] });
    if (!built.ok) {
      setAmountError(built.error);
      return;
    }
    setAmountError(null);
    recommend.mutate(built.request, {
      onError: (e) => showToast(getErrorMessage(e, 'Failed to simulate card rewards'), { tone: 'danger' }),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        size="md"
        title="Test a transaction"
        description="See which rule wins on this card, and what it earns with your real cap usage."
        secondary={{ label: 'Close', onSelect: onClose }}
        primary={{ label: 'Run test', onSelect: run, loading: recommend.isPending }}
      >
        <DialogBody>
          <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-2">
            <AmountField
              label="Amount"
              prefix="₹"
              size="lg"
              inputMode="decimal"
              value={form.amount}
              {...amountExpressionProps(form.amount, (amount) => patch({ amount }), () => setAmountError(null))}
              error={amountError ?? undefined}
            />
            <Select
              label="What"
              searchable
              options={[{ value: ANY, label: 'Any category' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
              value={form.categoryId}
              onValueChange={(v) => patch({ categoryId: asList(v)[0] ?? ANY })}
            />
            <Select
              label="How"
              options={CHANNEL_OPTIONS}
              value={form.channel}
              onValueChange={(v) => patch({ channel: asList(v)[0] ?? ANY })}
            />
            <DateField
              label="When"
              today={today}
              value={form.date}
              onValueChange={(v) => patch({ date: typeof v === 'string' ? v : '' })}
            />
          </div>
          <div>
            <Button type="button" variant="link" onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen}>
              More options
            </Button>
          </div>
          <Reveal open={moreOpen}>
            <div className="flex flex-col gap-space-12">
              <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-2">
                <TextField
                  label="Merchant"
                  optional
                  placeholder="e.g. Swiggy, Amazon…"
                  value={form.merchantText}
                  onValueChange={(merchantText) => patch({ merchantText })}
                />
                <TextField
                  label="MCC"
                  optional
                  placeholder="e.g. 5411, 5812…"
                  value={form.mcc}
                  onValueChange={(mcc) => patch({ mcc })}
                />
              </div>
              <div className="flex flex-wrap gap-space-16">
                <label className="flex items-center gap-space-8">
                  <Checkbox checked={form.isEmi} onCheckedChange={(c) => patch({ isEmi: c === true })} />
                  <Text variant="body">EMI transaction</Text>
                </label>
                <label className="flex items-center gap-space-8">
                  <Checkbox checked={form.isIntl} onCheckedChange={(c) => patch({ isIntl: c === true })} />
                  <Text variant="body">International</Text>
                </label>
              </div>
            </div>
          </Reveal>
          {recommend.data ? (
            card ? (
              <BreakdownContent detail={breakdown(card)} />
            ) : (
              <Text variant="body" tone="ink-3" as="p">
                This card has no result for that purchase.
              </Text>
            )
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
