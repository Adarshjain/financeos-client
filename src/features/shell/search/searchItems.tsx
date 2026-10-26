import React from 'react';

import { Icon, type SearchPaletteGroup, type SearchPaletteItem } from '@/components/ds';
import type { IconName } from '@/components/ds/Icon/Icon';
import { formatDayMonth } from '@/features/accounts/list/accountsList';
import { ALL_TIME, DEFAULT_QUERY, transactionsUrl } from '@/features/transactions/list/transactionsUrl';

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
}

/** The Transactions page for `q` over all time. */
export function transactionsSearchHref(q: string): string {
  return transactionsUrl({ ...DEFAULT_QUERY, q, period: ALL_TIME });
}

function joinTitle(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}

const matches = (label: string, needle: string) => !needle || label.toLowerCase().includes(needle);

/**
 * The palette's groups, in order: Accounts, Actions, Transactions, Holdings, Lending, Loans, Reports,
 * Dashboards, Pages, Ask. Pages and Actions filter on the text from its first character; the server
 * groups show only once the text has SEARCH_MIN_CHARS characters and an answer has arrived.
 */
export function buildSearchGroups({ query, result, pages, actions, go }: SearchItemsInput): SearchPaletteGroup[] {
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
    title: joinTitle([t.description, formatDayMonth(t.date)]),
    trailing: <SearchAmount amount={t.amount} />,
    onSelect: () => go(transactionsSearchHref(t.description)),
  }));
  if (transactions.length > 0) {
    transactions.push({
      id: 'transactions:see-all',
      title: 'See all matching transactions',
      onSelect: () => go(transactionsSearchHref(text)),
    });
  }

  return [
    {
      id: 'accounts',
      label: 'Accounts',
      items: (server?.accounts ?? []).map((a) =>
        link(`accounts:${a.id}`, joinTitle([a.name, a.last4 ? `••${a.last4}` : null]), `/accounts/${a.id}`),
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      items: actions
        .filter((a) => matches(a.label, needle))
        .map((a) => ({ id: `actions:${a.id}`, title: a.label, leading: <Icon name={a.icon} />, disabled: a.disabled, onSelect: a.onSelect })),
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
        ? [{ ...link('ask', `Ask the data: ${text}`, '/chat'), leading: <Icon name="chat" /> }]
        : [],
    },
  ];
}
