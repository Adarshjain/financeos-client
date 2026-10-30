'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Checkbox } from '@/components/ds/Checkbox/Checkbox';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { Select } from '@/components/ds/Select/Select';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { formatDate, formatMoney } from '@/lib/format';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { getAccountName } from '@/lib/utils';

import type { DividendPrefill } from './DividendFormDialog';
import { REASON_LABELS } from './dividendsModel';
import type { DividendMatchCandidate, DividendMatchItem, MatchTier } from './receiptTypes';
import { useDividendReconcile } from './useDividendReconcile';
import type { useUnrecordedCredits } from './useUnrecordedCredits';

const TIER_LABEL: Record<MatchTier, string> = { EXACT: 'Exact', NET_OF_TDS: 'Net of TDS', FUZZY: 'Fuzzy' };

/** Bank data older than this many days is called out as stale. */
const STALE_COVERAGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function isStale(coverageEnd: string | null | undefined, today: string): boolean {
  if (!coverageEnd) return false;
  return (Date.parse(today) - Date.parse(coverageEnd)) / DAY_MS > STALE_COVERAGE_DAYS;
}

function candidateLabel(c: DividendMatchCandidate, account: string): string {
  const t = c.transaction;
  return `${t.description || t.sourcedDescription || 'Transaction'} · ${account} · ${formatDate(t.date, 'list')} · +${formatMoney(Math.abs(t.amount), { decimals: 'auto' })}`;
}

interface ItemProps {
  item: DividendMatchItem;
  accounts: { id: string; name: string }[];
  r: ReturnType<typeof useDividendReconcile>;
  busy: boolean;
}

/** One unmatched dividend with the bank credits that could be it: pick one, optionally record the TDS, confirm. */
function MatchItem({ item, accounts, r, busy }: ItemProps) {
  const d = item.dividend;
  const selected = r.selectedCandidate(item);
  const expectedNet = Number(d.amount || 0) - Number(d.tds || 0);
  const options = item.candidates.map((c) => ({
    value: c.transaction.id,
    label: candidateLabel(c, getAccountName(accounts, c.transaction.accountId)),
  }));
  const selectedId = r.selected[d.id];
  const details = selected ? [TIER_LABEL[selected.tier], ...selected.reasons.map((reason) => REASON_LABELS[reason])] : [];

  return (
    <Card variant="inset">
      <div className="flex flex-col gap-space-8 p-space-12">
        <div className="flex items-baseline justify-between gap-space-8">
          <Text variant="body-strong" as="span">
            {`${d.symbol || d.instrumentName}${d.brokerName ? ` · ${d.brokerName}` : ''}`}
          </Text>
          <Text variant="label" tone="ink-3" as="span">
            {`${formatMoney(expectedNet, { decimals: 'auto' })} · ${formatDate(d.exDate ?? d.payDate, 'list')}`}
          </Text>
        </div>
        {options.length === 1 ? (
          <Text variant="body" as="div">
            {options[0].label}
          </Text>
        ) : (
          <Select
            size="sm"
            options={options}
            value={selectedId}
            placeholder="Choose transaction"
            onValueChange={(v) => r.select(d.id, v as string)}
          />
        )}
        {details.length > 0 ? (
          <Text variant="caption" tone="ink-3" as="div">
            {details.join(' · ')}
          </Text>
        ) : null}
        <div className="flex items-center justify-between gap-space-8">
          {r.tdsOffered(item) && selected?.impliedTds != null ? (
            <label className="flex items-center gap-space-8">
              <Checkbox checked={r.recordTds(item)} disabled={busy} onCheckedChange={(v) => r.setRecordTds(d.id, v === true)} />
              <Text variant="label" tone="ink-2" as="span">
                {`Record TDS ${formatMoney(selected.impliedTds, { decimals: 'auto' })}`}
              </Text>
            </label>
          ) : (
            <span />
          )}
          <Button size="sm" disabled={!selectedId || busy} loading={r.confirmingId === d.id} onClick={() => void r.confirmOne(d.id)}>
            Confirm
          </Button>
        </div>
      </div>
    </Card>
  );
}

export interface DividendReconcileDialogProps {
  /** The page's one unrecorded-credits scan, shared with the banner. */
  unrecorded: ReturnType<typeof useUnrecordedCredits>;
  today: string;
  onRecord: (prefill: DividendPrefill) => void;
  /** Called after matches were confirmed, so the page re-reads. */
  onChanged: () => void;
  onClose: () => void;
}

/** Receipt matching (bank credits that look like unmatched dividends) and the credits that look like dividends but are not recorded. */
export function DividendReconcileDialog({ unrecorded, today, onRecord, onChanged, onClose }: DividendReconcileDialogProps) {
  const r = useDividendReconcile({
    onLinked: onChanged,
    notify: (message, tone) => showToast(message, tone ? { tone } : undefined),
  });
  const { data: accounts = [] } = useAccounts();
  const busy = r.confirmingAll || r.confirmingId !== null;
  const found = r.items.length;

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="md"
        title="Reconcile"
        description="Match bank credits to your dividends and record the ones that are missing."
        secondary={{ label: 'Close', onSelect: onClose }}
      >
        <Dialog.Body>
          <div className="flex flex-col gap-space-8 desk:gap-space-16">
            <SectionHeader
              variant="band"
              borderTop={false}
              action={
                <span className="flex items-center gap-space-8">
                  {found > 0 ? (
                    <Button size="sm" variant="primary" disabled={busy} loading={r.confirmingAll} onClick={() => void r.confirmAll()}>
                      Confirm all
                    </Button>
                  ) : null}
                  <Button size="sm" loading={r.loading} onClick={() => void r.refetch()}>
                    Find matches
                  </Button>
                </span>
              }
            >
              Receipt matching
            </SectionHeader>
            {r.isError && !r.loading ? (
              <Text variant="body" tone="danger" as="div">
                Couldn&apos;t load matches. Try again.
              </Text>
            ) : r.loading && !r.fetched ? (
              <Skeleton height={64} />
            ) : !r.fetched ? (
              <Text variant="body" tone="ink-3" as="div">
                Find matches looks for bank credits that match your unmatched dividends.
              </Text>
            ) : found === 0 ? (
              <div className="flex flex-col gap-space-4">
                <Text variant="body" tone="ink-3" as="div">
                  No bank credits match your unmatched dividends.
                </Text>
                {r.meta && r.meta.unresolvedCount > 0 && isStale(r.meta.coverageEnd, today) ? (
                  <Text variant="label" tone="warning" as="div">
                    {`Your bank data stops at ${formatDate(r.meta.coverageEnd ?? '', 'list')}. Import a newer statement.`}
                  </Text>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-space-8">
                {r.items.map((item) => (
                  <MatchItem key={item.dividend.id} item={item} accounts={accounts} r={r} busy={busy} />
                ))}
              </div>
            )}
            {r.meta ? (
              <Text variant="caption" tone="ink-3" as="div">
                {`${r.meta.unresolvedCount} unmatched ${r.meta.unresolvedCount === 1 ? 'dividend' : 'dividends'} · ${r.meta.withCandidates} with candidates${
                  r.meta.coverageEnd ? ` · Bank data through ${formatDate(r.meta.coverageEnd, 'list')}` : ''
                }`}
              </Text>
            ) : null}

            <SectionHeader
              variant="band"
              action={
                <Button size="sm" loading={unrecorded.loading} onClick={() => void unrecorded.scan()}>
                  Scan bank credits
                </Button>
              }
            >
              Unrecorded dividend credits
            </SectionHeader>
            {unrecorded.isError && !unrecorded.loading ? (
              <Text variant="body" tone="danger" as="div">
                Couldn&apos;t load credits. Try again.
              </Text>
            ) : !unrecorded.fetched ? (
              <Skeleton height={48} />
            ) : unrecorded.items.length === 0 ? (
              <EmptyState compact description="No unrecorded dividend-like credits in the last year." />
            ) : (
              <div className="flex flex-col gap-space-8">
                {unrecorded.items.map(({ transaction: t, holdingHints }) => (
                  <Card variant="inset" key={t.id}>
                    <div className="flex flex-col gap-space-8 p-space-12">
                      <div className="flex items-baseline justify-between gap-space-8">
                        <Text variant="body-strong" as="span" truncate>
                          {t.description || t.sourcedDescription || 'Transaction'}
                        </Text>
                        <Text variant="body-strong" tone="positive" as="span">
                          {`+${formatMoney(Math.abs(t.amount), { decimals: 'auto' })}`}
                        </Text>
                      </div>
                      <Text variant="label" tone="ink-3" as="div">
                        {`${getAccountName(accounts, t.accountId)} · ${formatDate(t.date, 'list')}`}
                      </Text>
                      <span className="flex flex-wrap gap-space-8">
                        {(holdingHints.length === 0 ? [null] : holdingHints).map((h) => (
                          <Button
                            key={h?.holdingId ?? 'any'}
                            size="sm"
                            onClick={() =>
                              onRecord({
                                amount: Math.abs(t.amount),
                                payDate: t.date,
                                linkTransactionId: t.id,
                                brokerAccountId: h?.brokerAccountId,
                                instrumentId: h?.instrumentId,
                              })
                            }
                          >
                            {h ? `Record for ${h.symbol ?? h.instrumentName} · ${h.brokerName}` : 'Record dividend'}
                          </Button>
                        ))}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
