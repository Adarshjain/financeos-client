'use client';

import React from 'react';

import { Button, Card, Checkbox, ListRow, showToast, StatusWord, Text } from '@/components/ds';
import { TransactionPickerField } from '@/features/transactions/TransactionPickerField';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { formatMoney } from '@/lib/format';
import type { Transaction } from '@/lib/transaction.types';

import { creditLine, type EpfEntry, type EpfLinkedTransaction } from './epfModel';
import type { useEpfMutations } from './useEpfMutations';

export interface EpfCreditSectionProps {
  entry: EpfEntry;
  mutations: ReturnType<typeof useEpfMutations>;
  /** Called after a link, an unlink or "Not this one" saved and the page was refreshed. */
  onChanged?: () => void;
}

/** What the entry should land as in the bank: the shares (or the pension) less the TDS. */
function expectedNet(entry: EpfEntry): number {
  const gross = entry.withdrawalKind === 'PENSION' ? entry.pensionAmount : entry.employeeAmount + entry.employerAmount;
  return gross - (entry.tdsAmount ?? 0);
}

function CreditCard({ credit, footer }: { credit: EpfLinkedTransaction; footer: React.ReactNode }) {
  return (
    <Card variant="inset">
      <ListRow
        title={credit.description || 'Bank credit'}
        subtitle={creditLine(credit)}
        trailing={
          <Text variant="body-strong" tone="positive">{`+${formatMoney(credit.amount, { decimals: 'auto' })}`}</Text>
        }
      />
      <div className="flex items-center justify-between gap-space-8 px-space-12 pb-space-8">{footer}</div>
    </Card>
  );
}

/**
 * The bank credit of a withdrawal: the suggested match (Link, Not this one), the linked credit (Unlink), or a picker
 * for any credit by hand. Each change saves at once.
 */
export function EpfCreditSection({ entry, mutations, onChanged }: EpfCreditSectionProps) {
  const busy = mutations.creditBusy;
  const linked = entry.transaction ?? null;
  const suggestion = entry.suggestion ?? null;
  const [picking, setPicking] = React.useState(false);
  const [picked, setPicked] = React.useState<{ credit: Transaction; gap: number } | null>(null);
  const [recordTds, setRecordTds] = React.useState(true);

  const run = async (action: () => Promise<unknown>, done: string, failed: string, undo?: () => Promise<unknown>) => {
    try {
      await action();
      showToast(
        done,
        undo
          ? {
              action: {
                label: 'Undo',
                onSelect: () => {
                  void (async () => {
                    try {
                      await undo();
                      await mutations.refresh();
                      onChanged?.();
                    } catch (e) {
                      showToast(getErrorMessage(e, "Couldn't undo. Try again."), { tone: 'danger' });
                    }
                  })();
                },
              },
            }
          : undefined,
      );
      await mutations.refresh();
      onChanged?.();
    } catch (e) {
      showToast(getErrorMessage(e, failed), { tone: 'danger' });
    }
  };

  const link = (transactionId: string, withTds: boolean) =>
    run(() => mutations.link.mutateAsync({ id: entry.id, transactionId, recordTds: withTds }), 'Linked', "Couldn't link the bank credit. Try again.");

  const pick = (credit: Transaction) => {
    const gap = Math.round((expectedNet(entry) - Math.abs(credit.amount)) * 100) / 100;
    if (gap > 0 && (entry.tdsAmount ?? 0) === 0) {
      setPicked({ credit, gap });
      setRecordTds(true);
      return;
    }
    void link(credit.id, false);
  };

  if (picked) {
    return (
      <div className="flex flex-col gap-space-8 desk:gap-space-12">
        <Text variant="label" tone="ink-2" as="div">
          Bank credit
        </Text>
        <CreditCard
          credit={{
            id: picked.credit.id,
            amount: Math.abs(picked.credit.amount),
            date: picked.credit.date,
            description: picked.credit.description,
            accountName: undefined,
          }}
          footer={
            <>
              <span />
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setPicked(null)}>
                Choose another
              </Button>
            </>
          }
        />
        <ListRow
          className="px-0"
          leading={<Checkbox id="epf-record-tds" checked={recordTds} onCheckedChange={(on) => setRecordTds(on === true)} />}
          title={<label htmlFor="epf-record-tds">{`Record TDS of ${formatMoney(picked.gap, { decimals: 'auto' })}`}</label>}
        />
        <div>
          <Button type="button" size="sm" disabled={busy} onClick={() => void link(picked.credit.id, recordTds)}>
            Link
          </Button>
        </div>
      </div>
    );
  }

  if (linked) {
    return (
      <div className="flex flex-col gap-space-8 desk:gap-space-12">
        <Text variant="label" tone="ink-2" as="div">
          Bank credit
        </Text>
        <CreditCard
          credit={linked}
          footer={
            <>
              <StatusWord tone="info">Linked</StatusWord>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => mutations.unlink.mutateAsync(entry.id),
                    'Bank credit unlinked',
                    "Couldn't unlink the bank credit. Try again.",
                    () => mutations.link.mutateAsync({ id: entry.id, transactionId: linked.id, recordTds: false }),
                  )
                }
              >
                Unlink
              </Button>
            </>
          }
        />
      </div>
    );
  }

  if (suggestion && !picking) {
    return (
      <div className="flex flex-col gap-space-8 desk:gap-space-12">
        <Text variant="label" tone="ink-2" as="div">
          Bank credit
        </Text>
        <CreditCard
          credit={suggestion}
          footer={
            <>
              <StatusWord tone="warning">Suggested match</StatusWord>
              <span className="flex items-center gap-space-8">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => mutations.dismiss.mutateAsync({ id: entry.id, transactionId: suggestion.id }),
                      'Suggestion dismissed',
                      "Couldn't dismiss the suggestion. Try again.",
                    )
                  }
                >
                  Not this one
                </Button>
                <Button type="button" size="sm" disabled={busy} onClick={() => void link(suggestion.id, false)}>
                  Link
                </Button>
              </span>
            </>
          }
        />
        <Text variant="label" tone="ink-3" as="div">
          {'Not this one shows the next likely credit; '}
          <Button type="button" variant="link" size="sm" onClick={() => setPicking(true)}>
            Link transaction
          </Button>
          {' picks any credit by hand.'}
        </Text>
      </div>
    );
  }

  return (
    <TransactionPickerField
      label="Bank credit"
      value={null}
      onSelect={pick}
      onClear={() => undefined}
      type="CREDIT"
      excludeAnyObligationRef
      suggestAmount={expectedNet(entry)}
      suggestDate={entry.creditedOn}
      ruleHint="EPF withdrawals link money-in (credit) transactions."
      disabled={busy}
    />
  );
}
