'use client';

import { CounterpartyPicker } from '@/components/lendings/CounterpartyPicker';
import type { Account } from '@/lib/account.types';
import type { CounterpartySelection, LendingDirection, LendingResponse } from '@/lib/lending.types';
import type { Transaction } from '@/lib/transaction.types';
import { cn, formatDate, formatMoney, getAccountName } from '@/lib/utils';

import { RecordLendingExistingEntryList } from '../record-lending/RecordLendingExistingEntryList';
import { RecordLendingNewEntryFields } from '../record-lending/RecordLendingNewEntryFields';

interface LendingLinkBodyProps {
  transaction: Transaction;
  accounts: Account[];
  direction: LendingDirection;
  party: CounterpartySelection | null;
  setParty: (party: CounterpartySelection | null) => void;
  suggestedId: string | null;
  amount: string;
  setAmount: (value: string) => void;
  entryDate: string;
  setEntryDate: (value: string) => void;
  expectedReturnDate: string;
  setExpectedReturnDate: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  unlinkedEntries: LendingResponse[];
  loadingExistingEntries: boolean;
  attachingId: string | null;
  onAttach: (lendingId: string) => void;
}

/**
 * Body for the LENDING link kind. Person first; once an existing person with
 * unlinked entries in this direction is chosen, an "attach to existing" section
 * appears above the new-entry fields, so there is no mode toggle to reason
 * about. Purely presentational — all state lives in `useRecordLending`, shared
 * with the dialog's footer for the primary action.
 */
export function LendingLinkBody({
  transaction,
  accounts,
  direction,
  party,
  setParty,
  suggestedId,
  amount,
  setAmount,
  entryDate,
  setEntryDate,
  expectedReturnDate,
  setExpectedReturnDate,
  notes,
  setNotes,
  unlinkedEntries,
  loadingExistingEntries,
  attachingId,
  onAttach,
}: LendingLinkBodyProps) {
  const directionCopy =
    direction === 'lent' ? 'I gave money (Lent)' : 'I received money (Borrowed)';

  const existingPerson = party?.kind === 'existing' ? party.counterparty : null;
  const showExisting = existingPerson !== null && unlinkedEntries.length > 0;
  const entryWord = unlinkedEntries.length === 1 ? 'entry' : 'entries';

  return (
    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
      <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-0.5">
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
          {transaction.description ?? transaction.sourcedDescription}
        </div>
        <div className="flex items-center justify-between text-2xs text-slate-500 dark:text-slate-400">
          <span>
            {getAccountName(accounts, transaction.accountId)} · {formatDate(transaction.date)}
          </span>
          <span
            className={cn(
              'font-bold tabular-nums',
              transaction.amount >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-900 dark:text-white',
            )}
          >
            {transaction.amount >= 0 ? '+' : '-'}
            {formatMoney(Math.abs(transaction.amount))}
          </span>
        </div>
      </div>

      <div className="p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/40 dark:bg-indigo-950/10 space-y-0.5">
        <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
          {directionCopy}
        </div>
        <div className="text-2xs text-slate-500 dark:text-slate-400">
          Direction follows the transaction: money out = lent, money in = borrowed.
        </div>
      </div>

      <CounterpartyPicker
        id="lendingCpSelect"
        value={party}
        onChange={setParty}
        suggestedId={suggestedId}
      />

      {existingPerson && loadingExistingEntries && !showExisting && (
        <p className="text-2xs text-slate-400 px-1">Checking for unlinked entries...</p>
      )}

      {showExisting && (
        <div className="p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/40 dark:bg-indigo-950/10 space-y-1.5">
          <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
            Attach to an existing entry
          </div>
          <p className="text-2xs text-slate-500 dark:text-slate-400">
            {existingPerson.name} has {unlinkedEntries.length} unlinked {direction} {entryWord}.
            Attach this transaction to one, or record a new entry below.
          </p>
          <RecordLendingExistingEntryList
            entries={unlinkedEntries}
            attachingId={attachingId}
            onAttach={onAttach}
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {showExisting ? 'Or record a new entry' : 'New entry'}
        </div>
        <RecordLendingNewEntryFields
          amount={amount}
          setAmount={setAmount}
          entryDate={entryDate}
          setEntryDate={setEntryDate}
          expectedReturnDate={expectedReturnDate}
          setExpectedReturnDate={setExpectedReturnDate}
          notes={notes}
          setNotes={setNotes}
        />
      </div>
    </div>
  );
}
