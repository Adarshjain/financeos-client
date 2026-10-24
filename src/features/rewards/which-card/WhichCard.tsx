'use client';

import React from 'react';

import {
  Badge,
  Button,
  Card,
  CardEmpty,
  CardRow,
  Checkbox,
  DateField,
  ListRow,
  Reveal,
  Select,
  showToast,
  Text,
  TextField,
} from '@/components/ds';
import { AmountField } from '@/components/organisms';
import { useRecommendCards } from '@/features/rewards/queries/useRewardRecommendMutation';
import { amountExpressionProps } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';

import { WhichCardBreakdownDialog } from './WhichCardBreakdownDialog';
import type { WhichCardData } from './whichCardData';
import {
  ANY,
  assumptions,
  breakdown,
  buildRequest,
  cardRow,
  cardsEvaluated,
  CHANNEL_OPTIONS,
  initialForm,
  resultTitle,
  type WhichCardForm,
} from './whichCardModel';

const FORM_ID = 'which-card-form';

const asList = (v: string | string[]): string[] => (Array.isArray(v) ? v : v ? [v] : []);

/**
 * The Which card? tab (boards D-rewards-picker, P-rewards-picker): the planned spend, then the cards ranked by what it
 * would earn. A card's row opens its full breakdown in a dialog (state, not the address).
 */
export function WhichCard({ data, today }: { data: WhichCardData; today: string }) {
  const [form, setForm] = React.useState<WhichCardForm>(() => initialForm(today));
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [amountError, setAmountError] = React.useState<string | null>(null);
  const [openCardId, setOpenCardId] = React.useState<string | null>(null);
  const recommend = useRecommendCards();
  const result = recommend.data ?? null;

  const patch = (next: Partial<WhichCardForm>) => setForm((f) => ({ ...f, ...next }));

  const categoryOptions = data.categories.map((c) => ({ value: c.id, label: c.name }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const built = buildRequest(form);
    if (!built.ok) {
      setAmountError(built.error);
      return;
    }
    setAmountError(null);
    recommend.mutate(built.request, {
      onError: (err) => showToast(getErrorMessage(err, 'Failed to simulate card rewards'), { tone: 'danger' }),
    });
  };

  const rows = result ? result.recommendations.map(cardRow) : [];
  const opened = result?.recommendations.find((c) => c.accountId === openCardId);
  const assumed = result ? assumptions(result) : null;

  return (
    <div className="flex flex-col gap-space-16">
      <Text variant="body" tone="ink-3" as="div">
        Ranks your cards by the rupees a purchase would earn, after caps, milestones and fees
      </Text>

      <Card>
        <CardRow>
          <form id={FORM_ID} onSubmit={submit} className="flex flex-col gap-space-12">
            <div className="grid grid-cols-1 gap-space-12 desk:grid-cols-4">
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
                options={[{ value: ANY, label: 'Any category' }, ...categoryOptions]}
                value={form.categoryId}
                onValueChange={(v) => patch({ categoryId: asList(v)[0] ?? ANY })}
                searchable
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
                  <Select
                    label="More categories"
                    multiple
                    searchable
                    placeholder="None"
                    options={categoryOptions}
                    value={form.moreCategoryIds}
                    onValueChange={(v) => patch({ moreCategoryIds: asList(v) })}
                  />
                  <Select
                    label="Cards to compare"
                    multiple
                    placeholder="All cards"
                    options={data.cards.map((c) => ({ value: c.id, label: c.name }))}
                    value={form.accountIds}
                    onValueChange={(v) => patch({ accountIds: asList(v) })}
                    emptyText={() => 'No credit cards available'}
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
          </form>
        </CardRow>
      </Card>

      <Card
        title={result ? resultTitle(result.input, data.categories, today) : 'Ranked cards'}
        subtitle={result ? cardsEvaluated(result.recommendations.length) : undefined}
        action={
          <Button type="submit" form={FORM_ID} variant="link" loading={recommend.isPending} loadingLabel="Evaluating…">
            Rank cards
          </Button>
        }
      >
        {rows.length === 0 ? (
          <CardEmpty>
            {result
              ? 'No credit cards to rank.'
              : 'Enter the spend details above and select Rank cards to simulate rewards across your cards.'}
          </CardEmpty>
        ) : (
          rows.map((row) => (
            <ListRow
              key={row.accountId}
              highlighted={row.best}
              onClick={() => setOpenCardId(row.accountId)}
              leading={
                <Badge tone={row.best ? 'success' : 'neutral'} shape="rounded">
                  {row.rank}
                </Badge>
              }
              title={
                <span className="flex flex-wrap items-center gap-space-6">
                  <Text variant="body-strong">{row.name}</Text>
                  {row.best ? <Badge tone="success">Best</Badge> : null}
                </span>
              }
              subtitle={
                <span className="flex flex-col gap-space-2">
                  <Text variant="caption" tone="ink-3" as="span">
                    {row.detail}
                  </Text>
                  {row.notes.map((n) => (
                    <Text key={n.text} variant="caption" tone={n.tone === 'warning' ? 'warning' : 'ink-3'} as="span">
                      {n.text}
                    </Text>
                  ))}
                </span>
              }
              trailing={
                <span className="flex flex-col items-end">
                  <Text variant="title" tone={row.best ? 'positive' : 'ink'} as="span">
                    {row.earn}
                  </Text>
                  <Text variant="caption" tone="ink-3" as="span">
                    {row.effective}
                  </Text>
                </span>
              }
            />
          ))
        )}
      </Card>

      {assumed ? (
        <Card title="Assumptions">
          <ListRow
            title={<Text tone="ink-3">Point values</Text>}
            trailing={<Text>{assumed.pointValues ?? '—'}</Text>}
          />
          <ListRow title={<Text tone="ink-3">Merchant MCC</Text>} trailing={<Text>{assumed.mcc ?? '—'}</Text>} />
        </Card>
      ) : null}

      {opened ? <WhichCardBreakdownDialog detail={breakdown(opened)} onClose={() => setOpenCardId(null)} /> : null}
    </div>
  );
}
