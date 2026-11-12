'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { loadCorporateActionDialog } from '@/features/investments/lazyDialogs';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { CorporateActionReviewItem, CorporateActionReviewResponse } from '@/lib/api/types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { useAppRouter } from '@/lib/useAppRouter';

import {
  dismissCorporateActionSuggestion,
  loadCorporateActionSuggestion,
  undoCorporateActionSuggestion,
} from './corporateActionActions';
import type { CorporateActionDialogProps } from './CorporateActionDialog';
import { appliedCard, notTradingCard, reviewCard,type ReviewCardModel } from './corporateActionReviewModel';

type DialogProps = Pick<CorporateActionDialogProps, 'instrument' | 'type' | 'prefill' | 'suggestionId'>;

function Lines({ lines }: { lines: ReviewCardModel['lines'] }) {
  return (
    <>
      {lines.map((line) => (
        <Card.Row key={line.label} className="items-baseline">
          <Text variant="body" tone="ink-3" as="div" className="w-1/3 shrink-0 desk:w-48">
            {line.label}
          </Text>
          <Text variant="body" as="div" className="flex-1 min-w-0">
            {line.value}
          </Text>
        </Card.Row>
      ))}
    </>
  );
}

/** The card's heading and the line under it, wrapping (never cut). */
function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Card.Header>
      <div className="min-w-0">
        <Text variant="heading" as="div">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="label" tone="ink-3" as="div">
            {subtitle}
          </Text>
        ) : null}
      </div>
    </Card.Header>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <Card.Footer className="justify-start">{children}</Card.Footer>;
}

export interface CorporateActionReviewProps {
  review: CorporateActionReviewResponse;
}

/** The detected corporate actions above the recorded list: what needs a decision, what was applied automatically. */
export function CorporateActionReview({ review }: CorporateActionReviewProps) {
  const router = useAppRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [dialog, setDialog] = React.useState<DialogProps | null>(null);
  const { Component: CorporateActionDialog, run } = useLazyDialog(loadCorporateActionDialog);

  const attempt = async (key: string, work: () => Promise<void>, failure: string) => {
    setBusy(key);
    try {
      await work();
    } catch (e) {
      showToast(getErrorMessage(e, failure), { tone: 'danger' });
    } finally {
      setBusy(null);
    }
  };

  const settle = async (key: string, id: string, kind: 'undo' | 'dismiss') =>
    attempt(
      key,
      async () => {
        await unwrapAction((kind === 'undo' ? undoCorporateActionSuggestion : dismissCorporateActionSuggestion)(id));
        void invalidateInvestmentQueries(qc);
        router.refresh();
        showToast(kind === 'undo' ? 'Removed' : 'Dismissed');
      },
      "Couldn't update this. Try again.",
    );

  const openReview = (item: CorporateActionReviewItem) =>
    attempt(
      `${item.id}|review`,
      async () => {
        const suggestion = await unwrapAction(loadCorporateActionSuggestion(item.id));
        const type = suggestion.kind === 'other' || suggestion.kind === 'oversold' ? undefined : suggestion.kind;
        await run(() =>
          setDialog({
            instrument: suggestion.instrument,
            type,
            prefill: { exDate: suggestion.exDate, ratioFrom: suggestion.ratioFrom, ratioTo: suggestion.ratioTo },
            suggestionId: suggestion.id,
          }),
        );
      },
      "Couldn't open this. Try again.",
    );

  const openRecord = (key: string, item: { id: string; name: string; symbol?: string | null }, type?: DialogProps['type']) =>
    attempt(
      key,
      async () => {
        await run(() => setDialog({ instrument: { id: item.id, name: item.name, symbol: item.symbol ?? null }, type }));
      },
      "Couldn't open this. Try again.");

  const needs = review.needsReview;
  const trading = review.notTrading;
  const applied = review.appliedAutomatically;

  return (
    <>
      {needs.length + trading.length > 0 ? (
        <section className="flex flex-col gap-space-8 desk:gap-space-16">
          <Text variant="heading" as="h2">{`Needs your review (${needs.length + trading.length})`}</Text>
          {needs.map((item) => {
            const card = reviewCard(item);
            return (
              <Card key={item.id}>
                <Heading title={card.heading} subtitle={card.subheading} />
                <Lines lines={card.lines} />
                <Actions>
                  {item.kind === 'oversold' ? (
                    <Button size="sm" variant="secondary" loading={busy === `${item.id}|record`} onClick={() => void openRecord(`${item.id}|record`, item.instrument)}>
                      Record a corporate action
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" loading={busy === `${item.id}|review`} onClick={() => void openReview(item)}>
                      Review and apply
                    </Button>
                  )}
                  <Button size="sm" variant="link" loading={busy === `${item.id}|dismiss`} onClick={() => void settle(`${item.id}|dismiss`, item.id, 'dismiss')}>
                    Not applicable
                  </Button>
                </Actions>
              </Card>
            );
          })}
          {trading.map((stock) => {
            const card = notTradingCard(stock);
            return (
              <Card key={`nt-${card.id}`}>
                <Heading title={card.heading} />
                {card.lines.map((line) => (
                  <Card.Row key={line}>
                    <Text variant="body" as="div" className="min-w-0">
                      {line}
                    </Text>
                  </Card.Row>
                ))}
                <Card.Row>
                  <Text variant="body" tone="ink-3" as="div" className="min-w-0">
                    {card.advice}
                  </Text>
                </Card.Row>
                <Actions>
                  <Button size="sm" variant="secondary" loading={busy === `${card.id}|merged`} onClick={() => void openRecord(`${card.id}|merged`, stock.instrument, 'merger')}>
                    Merged
                  </Button>
                  <Button size="sm" variant="link" loading={busy === `${card.id}|delisted`} onClick={() => void openRecord(`${card.id}|delisted`, stock.instrument, 'delisted')}>
                    Delisted
                  </Button>
                </Actions>
              </Card>
            );
          })}
        </section>
      ) : null}
      {applied.length > 0 ? (
        <section className="flex flex-col gap-space-8 desk:gap-space-16">
          <Text variant="heading" as="h2">{`Applied automatically (${applied.length})`}</Text>
          {applied.map((item) => {
            const card = appliedCard(item);
            return (
              <Card key={item.id}>
                <Heading title={card.heading} subtitle={card.subheading} />
                <Lines lines={card.lines} />
                <Actions>
                  <Button size="sm" variant="secondary" loading={busy === `${item.id}|undo`} onClick={() => void settle(`${item.id}|undo`, item.id, 'undo')}>
                    Undo
                  </Button>
                </Actions>
              </Card>
            );
          })}
        </section>
      ) : null}
      {dialog && CorporateActionDialog ? <CorporateActionDialog {...dialog} onClose={() => setDialog(null)} /> : null}
    </>
  );
}
