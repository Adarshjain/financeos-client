'use client';

import { Button } from '@/components/ui/button';
import type { Account } from '@/lib/account.types';
import type { CounterpartyResponse, LendingDirection, LendingResponse } from '@/lib/lending.types';
import type { Transaction } from '@/lib/transaction.types';
import { cn, formatDate, formatMoney, getAccountName } from '@/lib/utils';

import { RecordLendingCounterpartyPicker } from '../record-lending/RecordLendingCounterpartyPicker';
import { RecordLendingExistingEntryList } from '../record-lending/RecordLendingExistingEntryList';
import { RecordLendingNewEntryFields } from '../record-lending/RecordLendingNewEntryFields';
import { NEW_COUNTERPARTY_VALUE } from '../record-lending/useRecordLending';

interface LendingLinkBodyProps {
  transaction: Transaction;
  accounts: Account[];
  direction: LendingDirection;
  mode: 'new' | 'existing';
  setMode: (mode: 'new' | 'existing') => void;
  counterparties: CounterpartyResponse[];
  loadingCounterparties: boolean;
  selectedCpId: string;
  setSelectedCpId: (id: string) => void;
  newCpName: string;
  setNewCpName: (name: string) => void;
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
 * Body for the LENDING link kind: what used to be the standalone
 * "Record as lending" dialog, minus its own Dialog chrome (now supplied by
 * `TransactionLinkDialog`). Purely presentational — all state lives in
 * `useRecordLending`, shared with the dialog's footer for the primary action.
 */
export function LendingLinkBody({
  transaction,
  accounts,
  direction,
  mode,
  setMode,
  counterparties,
  loadingCounterparties,
  selectedCpId,
  setSelectedCpId,
  newCpName,
  setNewCpName,
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

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            mode === 'new' &&
              'border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30',
          )}
          onClick={() => setMode('new')}
        >
          New entry
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            mode === 'existing' &&
              'border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30',
          )}
          onClick={() => setMode('existing')}
        >
          Existing entry
        </Button>
      </div>

      <RecordLendingCounterpartyPicker
        counterparties={counterparties}
        loading={loadingCounterparties}
        selectedCpId={selectedCpId}
        setSelectedCpId={setSelectedCpId}
        newCpName={newCpName}
        setNewCpName={setNewCpName}
        showNewNameInput={mode === 'new' && selectedCpId === NEW_COUNTERPARTY_VALUE}
      />

      {mode === 'new' ? (
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
      ) : (
        <RecordLendingExistingEntryList
          direction={direction}
          selectedCpId={selectedCpId}
          entries={unlinkedEntries}
          loading={loadingExistingEntries}
          attachingId={attachingId}
          onAttach={onAttach}
        />
      )}
    </div>
  );
}
