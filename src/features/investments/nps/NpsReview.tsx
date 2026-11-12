'use client';

import { useMutation } from '@tanstack/react-query';
import React from 'react';

import { ActionButton } from '@/components/ds/Button/ActionButton';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Select } from '@/components/ds/Select/Select';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { NpsReviewMatch, NpsReviewResponse, NpsReviewSetup, NpsReviewUnrecorded } from '@/lib/api/types';

import { dismissNpsLinks, linkNpsContribution, markNpsPaymentNotNps, markNpsSetupNotNps, recordNpsPayment } from './npsActions';
import { NPS_UPLOAD_HREF } from './npsImportModel';
import { contributionFacts, matchedLine, matchWhy, paymentFacts, recordOptions, reviewCount, setupLine, sinceLine } from './npsReviewModel';
import { useNpsMutations } from './useNpsMutations';

type Act = (key: string, run: () => Promise<unknown>, done: string, failed: string) => void;

/** A bank payment in full: date, amount, description (wrapped, never cut) and the account it is in. */
function PaymentLines({ payment }: { payment: NpsReviewMatch['candidates'][number] }) {
  const f = paymentFacts(payment);
  return (
    <div className="min-w-0 flex-1 flex flex-col gap-space-2">
      <Text variant="body-strong">
        {f.date} · {f.amount}
      </Text>
      <Text variant="body" tone="ink-2" className="break-words">
        {f.description}
      </Text>
      <Text variant="caption" tone="ink-3">
        {f.account}
      </Text>
    </div>
  );
}

function MatchCard({ match, busy, act }: { match: NpsReviewMatch; busy: boolean; act: Act }) {
  const c = contributionFacts(match.contribution);
  const why = matchWhy(match.why);
  const key = `match:${match.contribution.id}`;
  return (
    <Card.Row className="flex-col items-stretch gap-space-10" data-testid="nps-review-match">
      <Text variant="heading" as="div">
        Which payment is this contribution?
      </Text>
      <div className="flex flex-col gap-space-2">
        <Text variant="body-strong">
          {c.amount} · {c.date} · {c.tier}
        </Text>
        <Text variant="body" tone="ink-2">
          {c.account}
        </Text>
        <Text variant="caption" tone="ink-3">
          {c.source}
        </Text>
      </div>
      {why ? (
        <Text variant="body" tone="warning">
          {why}
        </Text>
      ) : null}
      <Card variant="inset">
        {match.candidates.map((p) => (
          <Card.Row key={p.transactionId} className="items-start first:border-t-0" data-testid="nps-review-candidate">
            <PaymentLines payment={p} />
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => act(key, () => unwrapAction(linkNpsContribution(match.contribution.id, p.transactionId)), 'Linked to the NPS contribution', "Couldn't link the payment. Try again.")}
            >
              This one
            </Button>
          </Card.Row>
        ))}
      </Card>
      <div>
        <Button
          variant="link"
          size="sm"
          disabled={busy}
          onClick={() =>
            act(key, () => unwrapAction(dismissNpsLinks(match.contribution.id, match.candidates.map((p) => p.transactionId))), 'Dismissed', "Couldn't update this suggestion. Try again.")
          }
        >
          None of these
        </Button>
      </div>
    </Card.Row>
  );
}

function UnrecordedCard({ item, busy, act }: { item: NpsReviewUnrecorded; busy: boolean; act: Act }) {
  const options = recordOptions(item);
  const [choice, setChoice] = React.useState(options[0]?.value ?? '');
  const picked = options.find((o) => o.value === choice) ?? options[0];
  const matched = matchedLine(item);
  const id = item.payment.transactionId;
  const key = `unrecorded:${id}`;
  return (
    <Card.Row className="flex-col items-stretch gap-space-10" data-testid="nps-review-unrecorded">
      <Text variant="heading" as="div">
        Record this payment as NPS?
      </Text>
      <div className="flex">
        <PaymentLines payment={item.payment} />
      </div>
      {matched ? (
        <Text variant="body" tone="ink-2">
          {matched}
        </Text>
      ) : null}
      <Text variant="body" tone="ink-2">
        {sinceLine(item.daysSince)}
      </Text>
      {options.length > 1 ? <Select label="Record to" size="sm" options={options} value={picked?.value} onValueChange={(v) => setChoice(v as string)} disabled={busy} /> : null}
      <div className="flex items-center gap-space-8">
        <Button
          variant="secondary"
          size="sm"
          disabled={busy || !picked}
          onClick={() => picked && act(key, () => unwrapAction(recordNpsPayment(id, picked.accountId, picked.tier)), 'Recorded as an NPS contribution', "Couldn't record the contribution. Try again.")}
        >
          Record
        </Button>
        <Button variant="link" size="sm" disabled={busy} onClick={() => act(key, () => unwrapAction(markNpsPaymentNotNps(id)), 'Marked as not NPS', "Couldn't update this payment. Try again.")}>
          Not NPS
        </Button>
      </div>
    </Card.Row>
  );
}

function SetupCard({ setup, busy, act }: { setup: NpsReviewSetup; busy: boolean; act: Act }) {
  return (
    <Card.Row className="flex-col items-stretch gap-space-10" data-testid="nps-review-setup">
      <Text variant="heading" as="div">
        Looks like you invest in NPS
      </Text>
      <Text variant="body" tone="ink-2">
        {setupLine(setup)}
      </Text>
      <Card variant="inset">
        {setup.sample.map((p) => (
          <Card.Row key={p.transactionId} className="items-start first:border-t-0">
            <PaymentLines payment={p} />
          </Card.Row>
        ))}
      </Card>
      <div className="flex items-center gap-space-8">
        <ActionButton variant="secondary" size="sm" href={NPS_UPLOAD_HREF} disabled={busy}>
          Set up NPS
        </ActionButton>
        <Button variant="link" size="sm" disabled={busy} onClick={() => act('setup', () => unwrapAction(markNpsSetupNotNps()), 'Marked as not NPS', "Couldn't update this. Try again.")}>
          Not NPS
        </Button>
      </div>
    </Card.Row>
  );
}

/** What the app left to the user on the NPS page: each card shows what was found, the evidence, and why the app didn't decide. */
export function NpsReview({ review }: { review: NpsReviewResponse | null | undefined }) {
  const { refresh } = useNpsMutations();
  const mutation = useMutation({ mutationFn: (v: { key: string; run: () => Promise<unknown> }) => v.run() });

  const act: Act = (key, run, done, failed) => {
    void (async () => {
      try {
        await mutation.mutateAsync({ key, run });
      } catch (e) {
        void showToast(getErrorMessage(e, failed), { tone: 'danger' });
        return;
      }
      void showToast(done);
      await refresh();
    })();
  };

  const count = reviewCount(review);
  if (!review || count === 0) return null;
  const busy = mutation.isPending;
  return (
    <Card data-testid="nps-review">
      <Card.Header title="Needs your review" subtitle={`${count} ${count === 1 ? 'item' : 'items'}`} />
      {review.matches.map((m) => (
        <MatchCard key={m.contribution.id} match={m} busy={busy} act={act} />
      ))}
      {review.unrecorded.map((u) => (
        <UnrecordedCard key={u.payment.transactionId} item={u} busy={busy} act={act} />
      ))}
      {review.setup ? <SetupCard setup={review.setup} busy={busy} act={act} /> : null}
    </Card>
  );
}
