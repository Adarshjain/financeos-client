'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import type { TransactionListRow } from '@/features/transactions/list/transactionRowsModel';
import type { TransactionsListResult } from '@/features/transactions/list/TransactionsListPane';
import type { Account } from '@/lib/account.types';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';

import type { TransactionsQuery } from '../list/transactionsUrl';
import { applyChanges, applyTo, type OptimisticChange } from './optimisticModel';

/**
 * A change on screen. `send` runs the request behind any earlier write to the same rows (one at a time per
 * row, so writes reach the server in the order the person made them); `base` is the row as the server will
 * hold it when this write is sent (earlier changes applied, this one and later ones not); `settle(true)`
 * once the server took it (it stays until the page is read again), `settle(false)` takes it back.
 */
export interface OptimisticHandle {
  send: <T>(request: () => Promise<T>) => Promise<T>;
  base: (id: string) => Transaction | undefined;
  settle: (ok: boolean) => void;
}

export interface OptimisticTransactions {
  begin: (change: OptimisticChange) => OptimisticHandle;
}

const OptimisticContext = React.createContext<OptimisticTransactions | null>(null);

/** The page's optimistic layer, or null off the Transactions page (then every action waits for the server). */
export function useOptimisticTransactions(): OptimisticTransactions | null {
  return React.useContext(OptimisticContext);
}

export function OptimisticProvider({ value, children }: { value: OptimisticTransactions; children: React.ReactNode }) {
  return <OptimisticContext.Provider value={value}>{children}</OptimisticContext.Provider>;
}

interface Entry {
  key: number;
  change: OptimisticChange;
  settled: boolean;
}

interface Input {
  transactions: Transaction[];
  list: TransactionsListResult;
  accounts: Account[] | null;
  query: TransactionsQuery;
  needsReviewCount: number | null;
}

/** The page was read again: what the server confirmed is in it, so settled entries go; ones still in flight stay. */
const afterRead = (es: Entry[]) => es.filter((e) => !e.settled);

/**
 * Shows a change before the server answers, on top of the page the server rendered (the list is server
 * data, not a query cache). Changes are written in a transition, so a row that leaves folds out through
 * RowTransition. A failed change is dropped (the row comes back) and the page is read again once nothing
 * is in flight. A settled one stays until the page is read again: the refresh after a save must not bring
 * the old row back for a moment. A transaction opened from a link (not on the page) lives in the
 * detail's query cache, so that is changed too.
 */
export function useOptimisticLayer({ transactions, list, accounts, query, needsReviewCount }: Input) {
  const qc = useQueryClient();
  const router = useRouter();
  const [entries, setEntries] = React.useState<Entry[]>([]);
  // The same entries, readable from handlers (a request is sent later than the render that showed it).
  const live = React.useRef<Entry[]>([]);
  const serverRef = React.useRef(transactions);
  const nextKey = React.useRef(0);
  const tails = React.useRef(new Map<string, Promise<unknown>>());

  const commit = (next: Entry[]) => {
    live.current = next;
    React.startTransition(() => setEntries(next));
  };

  const [seen, setSeen] = React.useState(transactions);
  if (seen !== transactions) {
    setSeen(transactions);
    setEntries(afterRead);
  }
  React.useEffect(() => {
    serverRef.current = transactions;
    live.current = afterRead(live.current);
  }, [transactions]);

  const api = React.useMemo<OptimisticTransactions>(
    () => ({
      begin: (change) => {
        const key = nextKey.current++;
        commit([...live.current, { key, change, settled: false }]);

        // The detail of a transaction opened from a link is a query, not a page row.
        const cached = new Map<string, { before: Transaction; shown: Transaction }>();
        for (const id of change.ids) {
          const before = qc.getQueryData<Transaction>(keys.transactions.byId(id));
          if (!before) continue;
          const next = applyTo(before, [change]);
          if (!next) continue;
          qc.setQueryData(keys.transactions.byId(id), next);
          // What the cache holds now (it may share structure with `next`), to tell later whether anything else wrote.
          cached.set(id, { before, shown: qc.getQueryData<Transaction>(keys.transactions.byId(id)) ?? next });
        }

        return {
          base: (id) => {
            // On the page, or (opened from a link) in the detail's query as it was before our change.
            const from = serverRef.current.find((t) => t.id === id) ?? cached.get(id)?.before ?? qc.getQueryData<Transaction>(keys.transactions.byId(id));
            const earlier = live.current.filter((e) => e.key < key).map((e) => e.change);
            return from ? applyTo(from, earlier) : undefined;
          },
          send: (request) => {
            const waits = change.ids.map((id) => tails.current.get(id)).filter((p) => p !== undefined);
            const run = waits.length === 0 ? request() : Promise.all(waits).then(request);
            // The chain only orders later requests; the failure itself is reported through `run`.
            const tail = run.catch(() => undefined);
            for (const id of change.ids) tails.current.set(id, tail);
            return run;
          },
          settle: (ok) => {
            if (ok) {
              commit(live.current.map((e) => (e.key === key ? { ...e, settled: true } : e)));
              return;
            }
            for (const [id, { before, shown }] of cached) {
              if (qc.getQueryData(keys.transactions.byId(id)) === shown) qc.setQueryData(keys.transactions.byId(id), before);
            }
            const next = live.current.filter((e) => e.key !== key);
            commit(next);
            if (next.every((e) => e.settled)) router.refresh();
          },
        };
      },
    }),
    // commit only touches refs and setEntries, which are stable
     
    [qc, router],
  );

  const rows: TransactionListRow[] = list.ok ? list.rows : [];
  const view = applyChanges(
    transactions,
    rows,
    entries.map((e) => e.change),
    { accounts, query },
  );
  if (!view) return { api, transactions, list, needsReviewCount };
  return {
    api,
    transactions: view.transactions,
    list: list.ok
      ? { ...list, rows: view.rows, totalElements: Math.max(0, list.totalElements - view.gone) }
      : list,
    needsReviewCount: needsReviewCount === null ? null : Math.max(0, needsReviewCount + view.needsReviewDelta),
  };
}
