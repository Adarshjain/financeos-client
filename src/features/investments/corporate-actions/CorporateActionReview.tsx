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
import { keys } from '@/lib/query/keys';
import { useAppRouter } from '@/lib/useAppRouter';

import {
  dismissCorporateActionSuggestion,
  loadCorporateActionSuggestion,
  loadInstrumentCorporateActions,
  undoCorporateActionSuggestion,
} from './corporateActionActions';
import type { CorporateActionDialogProps } from './CorporateActionDialog';
import { appliedCard, notTradingCard, reviewCard,type ReviewCardModel } from './corporateActionReviewModel';
import { type EvidenceLine, firstUnrecordedChild } from './corporateActionSchemeModel';

type DialogProps = Pick<CorporateActionDialogProps, 'instrument' | 'type' | 'prefill' | 'suggestionId'>;

function Lines({ lines }: { lines: ReviewCardModel['lines'] }) {
  return (
    <div className="flex flex-col gap-space-6">
      {lines.map((line) => (
        <div key={line.label} className="flex items-baseline gap-space-12">
          <Text variant="body" tone="ink-3" as="div" className="w-1/3 shrink-0 desk:w-48">
            {line.label}
          </Text>
          <Text variant="body" as="div" className="flex-1 min-w-0">
            {line.value}
          </Text>
        </div>
      ))}
    </div>
  );
}

/** Evidence from the company's notices, one plain line each; a notice's source line carries a "View notice" link. */
function Evidence({ lines }: { lines?: EvidenceLine[] }) {
  if (!lines || lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-space-6">
      {lines.map((line, i) => (
        <div key={`${i}-${line.text}`} className="flex items-baseline gap-space-8 flex-wrap">
          <Text variant="body" tone={line.noticeUrl ? 'ink-3' : undefined} as="div">
            {line.text}
          </Text>
          {line.noticeUrl ? (
            <Button asChild variant="link" size="sm">
              <a href={line.noticeUrl} target="_blank" rel="noopener noreferrer">
                View notice
              </a>
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** An item's heading and the line under it, wrapping (never cut). */
function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
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
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-space-8 flex-wrap">{children}</div>;
}

/** One section: a card with the shared "N items" header and one separated block per item. */
function Section({ title, count, testId, children }: { title: string; count: number; testId: string; children: React.ReactNode }) {
  return (
    <Card data-testid={testId}>
      <Card.Header title={title} subtitle={`${count} ${count === 1 ? 'item' : 'items'}`} />
      {children}
    </Card>
  );
}

const BLOCK = 'flex-col items-stretch gap-space-10';

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
        void qc.invalidateQueries({ queryKey: keys.inbox.all });
        void qc.invalidateQueries({ queryKey: keys.shell.counts() });
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
        // A demerger into several companies that was interrupted: start at the first one not recorded yet.
        const children = suggestion.details?.children ?? [];
        const childIndex =
          type === 'demerger' && children.length > 1
            ? firstUnrecordedChild(children, await unwrapAction(loadInstrumentCorporateActions(suggestion.instrument.id)), suggestion.exDate)
            : undefined;
        await run(() =>
          setDialog({
            instrument: suggestion.instrument,
            type,
            prefill: {
              exDate: suggestion.exDate,
              ratioFrom: suggestion.ratioFrom,
              ratioTo: suggestion.ratioTo,
              possibleChildren: suggestion.possibleChildren,
              details: suggestion.details ?? null,
              childIndex,
            },
            suggestionId: suggestion.id,
          }),
        );
      },
      "Couldn't open this. Try again.",
    );

  const openRecord = (key: string, item: { id: string; name: string; symbol?: string | null }, type?: DialogProps['type'], prefill?: DialogProps['prefill']) =>
    attempt(
      key,
      async () => {
        await run(() => setDialog({ instrument: { id: item.id, name: item.name, symbol: item.symbol ?? null }, type, prefill }));
      },
      "Couldn't open this. Try again.");

  const needs = review.needsReview;
  const trading = review.notTrading;
  const applied = review.appliedAutomatically;

  const total = needs.length + trading.length;
  return (
    <>
      {total > 0 ? (
        <Section title="Needs your review" count={total} testId="ca-review">
          {needs.map((item) => {
            const card = reviewCard(item);
            return (
              <Card.Row key={item.id} className={BLOCK}>
                <Heading title={card.heading} subtitle={card.subheading} />
                <Lines lines={card.lines} />
                <Evidence lines={card.evidence} />
                {card.candidates?.map((line) => (
                  <Text key={line} variant="body" as="div">
                    {line}
                  </Text>
                ))}
                {card.note ? (
                  <Text variant="body" tone="ink-3" as="div">
                    {card.note}
                  </Text>
                ) : null}
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
              </Card.Row>
            );
          })}
          {trading.map((stock) => {
            const card = notTradingCard(stock);
            return (
              <Card.Row key={`nt-${card.id}`} className={BLOCK}>
                <Heading title={card.heading} />
                <div className="flex flex-col gap-space-6">
                  {card.lines.map((line) => (
                    <Text key={line} variant="body" as="div">
                      {line}
                    </Text>
                  ))}
                  <Text variant="body" tone="ink-3" as="div">
                    {card.advice}
                  </Text>
                </div>
                <Evidence lines={card.evidence} />
                <Actions>
                  <Button size="sm" variant="secondary" loading={busy === `${card.id}|merged`} onClick={() => void openRecord(`${card.id}|merged`, stock.instrument, 'merger', stock.details ? { details: stock.details } : undefined)}>
                    Merged
                  </Button>
                  <Button size="sm" variant="link" loading={busy === `${card.id}|delisted`} onClick={() => void openRecord(`${card.id}|delisted`, stock.instrument, 'delisted')}>
                    Delisted
                  </Button>
                </Actions>
              </Card.Row>
            );
          })}
        </Section>
      ) : null}
      {applied.length > 0 ? (
        <Section title="Applied automatically" count={applied.length} testId="ca-applied">
          {applied.map((item) => {
            const card = appliedCard(item);
            return (
              <Card.Row key={item.id} className={BLOCK}>
                <Heading title={card.heading} subtitle={card.subheading} />
                <Lines lines={card.lines} />
                {card.because ? (
                  <Text variant="body" as="div">
                    {card.because}
                  </Text>
                ) : null}
                <Evidence lines={card.evidence} />
                <Actions>
                  <Button size="sm" variant="secondary" loading={busy === `${item.id}|undo`} onClick={() => void settle(`${item.id}|undo`, item.id, 'undo')}>
                    Undo
                  </Button>
                </Actions>
              </Card.Row>
            );
          })}
        </Section>
      ) : null}
      {dialog && CorporateActionDialog ? <CorporateActionDialog {...dialog} onClose={() => setDialog(null)} /> : null}
    </>
  );
}
