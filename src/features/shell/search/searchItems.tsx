import React from 'react';

import { Icon, type SearchPaletteGroup, type SearchPaletteItem } from '@/components/ds';
import type { IconName } from '@/components/ds/Icon/Icon';
import { TransactionRow } from '@/components/organisms';
import { ALL_TIME, DEFAULT_QUERY, transactionsUrl } from '@/features/transactions/list/transactionsUrl';
import { supportsIngestion } from '@/lib/account.types';
import { formatDate, formatMoney } from '@/lib/format';
import type { AccountType } from '@/lib/types';

import { appHref } from '../routes';
import { SearchAmount } from './SearchAmount';
import { type GlobalSearchResult, SEARCH_MIN_CHARS } from './searchApi';

export interface SearchPage {
  id: string;
  label: string;
  icon: IconName;
  /** Legacy-shaped path; appHref picks the Dinero page. */
  href: string;
}

export interface SearchAction {
  id: string;
  label: string;
  icon: IconName;
  disabled?: boolean;
  onSelect: () => void;
}

export interface SearchItemsInput {
  query: string;
  /** The server's answer; null before any. */
  result: GlobalSearchResult | null;
  pages: SearchPage[];
  actions: SearchAction[];
  /** Goes to an app URL (already resolved through appHref). */
  go: (href: string) => void;
  /** Opens Add transaction with this account picked. */
  onAddTransaction: (accountId: string) => void;
  /** Opens Mark paid for a card's unpaid bill. */
  onMarkBillPaid: (bill: { statementId: string; cardName: string; remaining: number }) => void;
}

/** The Transactions page with this transaction's detail open. */
export function transactionHref(id: string): string {
  return transactionsUrl({ ...DEFAULT_QUERY, txn: id });
}

/** The nudge while the text is 1 or 2 characters long: server groups wait for 3. */
export const SEARCH_HINT = 'Type 3 or more characters to search accounts, transactions and more';

export function searchHint(query: string): string | undefined {
  const length = query.trim().length;
  return length > 0 && length < SEARCH_MIN_CHARS ? SEARCH_HINT : undefined;
}

/** The Transactions page for `q` over all time. */
export function transactionsSearchHref(q: string): string {
  return transactionsUrl({ ...DEFAULT_QUERY, q, period: ALL_TIME });
}

/** A transaction amount as the Transactions list writes it: "+46,800.00" for a credit, "24,990.00" for a debit. */
function transactionAmount(amount: number): string {
  const text = formatMoney(Math.abs(amount), { decimals: 'exact', symbol: false });
  return amount > 0 ? `+${text}` : text;
}

function joinTitle(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}

// No text shows nothing (owner, 2026-10-26): every row comes from what was typed.
const matches = (label: string, needle: string) => needle.length > 0 && label.toLowerCase().includes(needle);

/**
 * The palette's groups, in order: Accounts, Actions, Transactions, Holdings, Lending, Loans, Reports,
 * Dashboards, Pages, Ask. Pages and Actions filter on the text from its first character; the server
 * groups show only once the text has SEARCH_MIN_CHARS characters and an answer has arrived.
 */
export function buildSearchGroups({ query, result, pages, actions, go, onAddTransaction, onMarkBillPaid }: SearchItemsInput): SearchPaletteGroup[] {
  const text = query.trim();
  const needle = text.toLowerCase();
  const server = text.length >= SEARCH_MIN_CHARS ? result : null;
  const link = (id: string, title: string, href: string): SearchPaletteItem => ({
    id,
    title,
    onSelect: () => go(appHref(href)),
  });

  const transactions: SearchPaletteItem[] = (server?.transactions ?? []).map((t) => ({
    id: `transactions:${t.id}`,
    title: joinTitle([t.description, formatDate(t.date, 'list')]),
    row: ({ active }) => (
      <TransactionRow
        compact
        borderTop={false}
        highlighted={active}
        description={t.description}
        date={formatDate(t.date, 'list')}
        account={t.accountName}
        amount={transactionAmount(t.amount)}
        isCredit={t.amount > 0}
        query={text}
      />
    ),
    onSelect: () => go(transactionHref(t.id)),
  }));
  if (transactions.length > 0) {
    transactions.push({
      id: 'transactions:see-all',
      title: 'See all matching transactions',
      onSelect: () => go(transactionsSearchHref(text)),
    });
  }

  // The first matched account gets its own actions at the top of Actions, before the Quick add ones.
  const first = server?.accounts[0];
  const accountActions: SearchPaletteItem[] = first
    ? [
        {
          id: `actions:add-on:${first.id}`,
          title: `Add transaction on ${first.name}`,
          leading: <Icon name="add" />,
          onSelect: () => onAddTransaction(first.id),
        },
        ...(supportsIngestion(first.type.toLowerCase() as AccountType)
          ? [
              {
                id: `actions:upload:${first.id}`,
                title: `Upload a ${first.name} statement`,
                leading: <Icon name="upload" />,
                onSelect: () => go(appHref(`/transactions/import?account=${first.id}`)),
              },
            ]
          : []),
        ...(first.openBill
          ? [
              {
                id: `actions:mark-paid:${first.id}`,
                title: `Mark ${first.name} bill paid`,
                leading: <Icon name="check" />,
                onSelect: () =>
                  onMarkBillPaid({
                    statementId: first.openBill!.statementId,
                    cardName: first.name,
                    remaining: first.openBill!.remainingAmount,
                  }),
              },
            ]
          : []),
      ]
    : [];

  return [
    {
      id: 'accounts',
      label: 'Accounts',
      items: (server?.accounts ?? []).map((a) => ({
        ...link(`accounts:${a.id}`, joinTitle([a.name, a.last4 ? `••${a.last4}` : null]), `/accounts/${a.id}`),
        // What is owed on a card with an unpaid bill, as a debit amount.
        trailing: a.openBill ? <SearchAmount amount={-a.openBill.remainingAmount} prefix="You owe" /> : undefined,
      })),
    },
    {
      id: 'actions',
      label: 'Actions',
      items: [
        ...accountActions,
        ...actions
        .filter((a) => matches(a.label, needle))
        .map((a) => ({ id: `actions:${a.id}`, title: a.label, leading: <Icon name={a.icon} />, disabled: a.disabled, onSelect: a.onSelect })),
      ],
    },
    { id: 'transactions', label: 'Transactions', items: transactions },
    {
      id: 'holdings',
      label: 'Holdings',
      items: (server?.holdings ?? []).map((h) =>
        link(`holdings:${h.instrumentId}`, joinTitle([h.name, h.symbol]), `/investments/${h.instrumentId}`),
      ),
    },
    {
      id: 'lending',
      label: 'Lending',
      items: (server?.people ?? []).map((p) => link(`lending:${p.id}`, p.name, `/loans/lendings/${p.id}`)),
    },
    {
      id: 'loans',
      label: 'Loans',
      items: (server?.loans ?? []).map((l) => link(`loans:${l.id}`, joinTitle([l.name, l.lender]), `/loans/${l.id}`)),
    },
    {
      id: 'reports',
      label: 'Reports',
      items: (server?.reports ?? []).map((r) => link(`reports:${r.id}`, r.name, `/reports/${r.id}`)),
    },
    {
      id: 'dashboards',
      label: 'Dashboards',
      items: (server?.dashboards ?? []).map((d) => link(`dashboards:${d.id}`, d.name, `/dashboards/${d.id}`)),
    },
    {
      id: 'pages',
      label: 'Pages',
      items: pages
        .filter((p) => matches(p.label, needle))
        .map((p) => ({ ...link(`pages:${p.id}`, p.label, p.href), leading: <Icon name={p.icon} /> })),
    },
    {
      id: 'ask',
      label: 'Ask',
      items: text
        ? [{ ...link('ask', `Ask the data: ${text}`, `/chat?q=${encodeURIComponent(text)}`), leading: <Icon name="chat" /> }]
        : [],
    },
  ];
}
