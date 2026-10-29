'use client';

import React from 'react';

import { Button, Card, Divider, ListRow, Select, showToast, StatusWord, Text } from '@/components/ds';
import { TransactionPickerField } from '@/features/transactions/TransactionPickerField';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { formatDate, formatMoney } from '@/lib/format';
import type { Dividend } from '@/lib/types';

import { RECEIPT_NOTE_OPTIONS, type ReceiptNote, receiptNoteOf, receiptVariance, receiptWord, tdsHint } from './dividendsModel';
import type { useDividendMutations } from './useDividendMutations';

export interface DividendReceiptSectionProps {
  dividend: Dividend;
  /** The edit form's amount and TDS as typed, for the TDS hint. */
  amount: string;
  tds: string;
  onUseTds: (value: string) => void;
  mutations: ReturnType<typeof useDividendMutations>;
  /** Called after a link, unlink or note change has saved and the page was refreshed. */
  onChanged?: () => void;
}

/** The bank credit a payout landed as: link or unlink it, the receipt note, and the TDS hint. Each change saves at once. */
export function DividendReceiptSection({ dividend, amount, tds, onUseTds, mutations, onChanged }: DividendReceiptSectionProps) {
  const txn = dividend.transaction ?? null;
  const word = receiptWord(dividend.receiptStatus);
  const variance = receiptVariance(dividend);
  const expectedNet = Number(dividend.amount || 0) - Number(dividend.tds || 0);
  const hint = tdsHint(txn ? txn.signedAmount : null, Number(amount) || 0, tds);
  const busy = mutations.receiptBusy;

  const run = async (action: () => Promise<unknown>, done: string, failed: string) => {
    try {
      await action();
      showToast(done);
      await mutations.refresh();
      onChanged?.();
    } catch (e) {
      showToast(getErrorMessage(e, failed), { tone: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-12">
      <Divider />
      <div className="flex items-baseline justify-between gap-space-8">
        <Text variant="label" tone="ink-2" as="div">
          Receipt
        </Text>
        {word ? <StatusWord tone={word.tone}>{word.label}</StatusWord> : null}
      </div>

      {txn ? (
        <Card variant="inset">
          <ListRow
            title={txn.description || 'Bank credit'}
            subtitle={`${formatDate(txn.date, 'list')} · ${txn.accountName || 'Account'} · +${formatMoney(txn.signedAmount, { decimals: 'auto' })}`}
            trailing={
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void run(() => mutations.unlink.mutateAsync(dividend.id), 'Unlinked', "Couldn't unlink the bank credit. Try again.")}
              >
                Unlink
              </Button>
            }
          />
        </Card>
      ) : (
        <TransactionPickerField
          label="Bank credit"
          value={null}
          onSelect={(t) =>
            void run(() => mutations.link.mutateAsync({ id: dividend.id, transactionId: t.id }), 'Linked', "Couldn't link the bank credit. Try again.")
          }
          onClear={() => undefined}
          type="CREDIT"
          shareableKind="DIVIDEND"
          suggestAmount={expectedNet}
          suggestDate={dividend.payDate}
          ruleHint="Dividends link money-in (credit) transactions."
          disabled={busy}
        />
      )}

      {hint !== null ? (
        <Text variant="label" tone="ink-3" as="div">
          {`The credit is ${formatMoney(hint, { decimals: 'auto' })} short of the gross amount. `}
          <Button type="button" variant="link" size="sm" onClick={() => onUseTds(String(hint))}>
            {`Use ${formatMoney(hint, { decimals: 'auto' })} as TDS`}
          </Button>
        </Text>
      ) : null}
      {variance !== null ? (
        <Text variant="label" tone="warning" as="div">
          {`±${formatMoney(Math.abs(variance), { decimals: 'auto' })} vs expected`}
        </Text>
      ) : null}

      <Select
        label="Receipt note"
        options={RECEIPT_NOTE_OPTIONS}
        value={receiptNoteOf(dividend.receiptStatus)}
        disabled={busy || txn !== null}
        helper={
          txn
            ? 'Unlink to change it. The other notes are "received in an account that isn\'t tracked" and "not received".'
            : undefined
        }
        onValueChange={(v) =>
          void run(() => mutations.setNote.mutateAsync({ id: dividend.id, note: v as ReceiptNote }), 'Receipt note updated', "Couldn't update the receipt note. Try again.")
        }
      />
    </div>
  );
}
