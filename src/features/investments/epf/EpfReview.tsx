'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { EpfReviewMatch, EpfReviewResponse } from '@/lib/api/types';

import { creditFacts, daysApartLine, differenceLine, entryFacts, whyLine } from './epfReviewModel';
import { useEpfMutations } from './useEpfMutations';

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-space-12">
      <Text variant="body" tone="ink-3">
        {label}
      </Text>
      <Text variant="body-strong" className="text-right break-words min-w-0">
        {value}
      </Text>
    </div>
  );
}

function MatchCard({ match }: { match: EpfReviewMatch }) {
  const { link, dismiss, refresh } = useEpfMutations();
  const busy = link.isPending || dismiss.isPending;
  const e = entryFacts(match.entry);
  const c = creditFacts(match.credit);
  const why = whyLine(match.why);

  const run = async (kind: 'link' | 'dismiss') => {
    try {
      if (kind === 'link') await link.mutateAsync({ id: match.entry.id, transactionId: match.credit.transactionId, recordTds: false });
      else await dismiss.mutateAsync({ id: match.entry.id, transactionId: match.credit.transactionId });
    } catch (err) {
      return void showToast(getErrorMessage(err, "Couldn't update this suggestion. Try again."), { tone: 'danger' });
    }
    void showToast(kind === 'link' ? 'Linked to the EPF withdrawal' : 'Dismissed');
    await refresh();
  };

  return (
    <Card.Row className="flex-col items-stretch gap-space-10" data-testid="epf-review-match">
      <Text variant="heading" as="div">
        Is this bank credit your EPF withdrawal?
      </Text>
      <div className="flex flex-col gap-space-2">
        <Text variant="caption" tone="ink-3">
          EPF withdrawal
        </Text>
        <Fact label="Credited on" value={e.creditedOn} />
        <Fact label="Kind" value={e.kind} />
        <Fact label="Employer" value={e.employer} />
        <Fact label="Gross" value={e.gross} />
        {e.tds ? <Fact label="TDS" value={e.tds} /> : null}
        <Fact label="Received" value={e.received} />
      </div>
      <div className="flex flex-col gap-space-2">
        <Text variant="caption" tone="ink-3">
          Bank credit
        </Text>
        <Fact label="Date" value={c.date} />
        <Fact label="Amount" value={c.amount} />
        <Fact label="Account" value={c.account} />
        <Text variant="body" tone="ink-2" className="break-words">
          {c.description}
        </Text>
      </div>
      <Text variant="body" tone="ink-2">
        {differenceLine(match.difference)} · {daysApartLine(match.daysApart)}
      </Text>
      {why ? (
        <Text variant="body" tone="warning">
          {why}
        </Text>
      ) : null}
      <div className="flex items-center gap-space-8">
        <Button variant="secondary" size="sm" disabled={busy} loading={link.isPending} onClick={() => void run('link')}>
          Link
        </Button>
        <Button variant="link" size="sm" disabled={busy} loading={dismiss.isPending} onClick={() => void run('dismiss')}>
          Not this one
        </Button>
      </div>
    </Card.Row>
  );
}

/** The bank credits the app would not link to a withdrawal by itself: the user decides, with both sides in view. */
export function EpfReview({ review }: { review: EpfReviewResponse | null | undefined }) {
  if (!review || review.matches.length === 0) return null;
  const n = review.matches.length;
  return (
    <Card data-testid="epf-review">
      <Card.Header title="Needs your review" subtitle={`${n} ${n === 1 ? 'item' : 'items'}`} />
      {review.matches.map((m) => (
        <MatchCard key={`${m.entry.id}:${m.credit.transactionId}`} match={m} />
      ))}
    </Card>
  );
}
