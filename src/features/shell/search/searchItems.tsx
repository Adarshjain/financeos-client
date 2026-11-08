import React from 'react';

import { Icon } from '@/components/ds/Icon/Icon';
import { type IconName } from '@/components/ds/Icon/registry';
import { type SearchPaletteGroup, type SearchPaletteItem } from '@/components/ds/SearchPalette/SearchPalette';
import { Text } from '@/components/ds/Text/Text';
import { TransactionRow } from '@/components/organisms/TransactionRow/TransactionRow';
import { ALL_TIME, DEFAULT_QUERY, transactionsUrl } from '@/features/transactions/list/transactionsUrl';
import { KIND_WORDS } from '@/features/upcoming/recurringModel';
import { supportsIngestion } from '@/lib/account.types';
import { formatCount, formatDate } from '@/lib/format';
import { rowAmount } from '@/lib/transactionAmount';
import type { AccountType } from '@/lib/types';

import { appHref } from '../routes';
import { SearchAmount } from './SearchAmount';
import { type GlobalSearchResult, SEARCH_MIN_CHARS, type SearchRetirement, type SearchTransaction } from './searchApi';

export interface SearchPage {
  id: string;
  label: string;
  icon: IconName;
  /** App path; appHref resolves moved pages. */
  href: string;
  /** Where the page lives ("Investments · Stocks & funds"): shown after the label and matched like it. */
  context?: string;
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

/** The nudge while the text is 1 character long: server groups wait for 2. */
export const SEARCH_HINT = 'Type 2 or more characters to search accounts, transactions and more';

export function searchHint(query: string): string | undefined {
  const length = query.trim().length;
  return length > 0 && length < SEARCH_MIN_CHARS ? SEARCH_HINT : undefined;
}

/** The Transactions page filtered to a category (parentName null) or a sub-category, over all time. */
export function categoryHref(c: { key: string; parentName: string | null }): string {
  return transactionsUrl({
    ...DEFAULT_QUERY,
    period: ALL_TIME,
    ...(c.parentName === null ? { categories: [c.key] } : { subcategories: [c.key] }),
  });
}

/** The Rules page (it has no per-rule link). */
export const RULES_HREF = '/transactions/tags';

/** The Transactions page filtered to one tag, over all time. */
export function tagHref(id: string): string {
  return transactionsUrl({ ...DEFAULT_QUERY, period: ALL_TIME, tags: [id] });
}

/** The EPF screen, or the NPS screen on this account. */
export function retirementHref(r: Pick<SearchRetirement, 'kind' | 'accountId'>): string {
  return r.kind === 'NPS' && r.accountId ? `/investments/nps?account=${r.accountId}` : '/investments/epf';
}

/** Upcoming has no per-series page, so a bill opens the Upcoming list. */
export const UPCOMING_HREF = '/upcoming';

/** "EPF · Northwind Labs", "NPS · PRAN ••7731 · Zq Equity Fund", "NPS Vatsalya · PRAN ••5208 · For Aarav". */
function retirementTitle(r: SearchRetirement): string {
  return joinTitle([
    r.title,
    r.subtitle,
    r.pranLast4 ? `PRAN ••${r.pranLast4}` : null,
    r.matchedScheme ?? (r.holderName ? `For ${r.holderName}` : null),
  ]);
}

/** The Transactions page for `q` over all time. */
export function transactionsSearchHref(q: string): string {
  return transactionsUrl({ ...DEFAULT_QUERY, q, period: ALL_TIME });
}

/** A transaction amount as the Transactions list writes it: "+46,800.00" for a credit, "24,990.00" for a debit. */
function transactionAmount(t: SearchTransaction): string {
  const shown = rowAmount(t);
  if (!shown) return '—';
  return shown.credit ? `+${shown.text}` : shown.text;
}

function joinTitle(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}

/** Most rows the Pages group shows. */
const PAGES_CAP = 8;

// No text shows nothing (owner, 2026-10-26): every row comes from what was typed.
const matches = (label: string, needle: string) => needle.length > 0 && label.toLowerCase().includes(needle);

/**
 * The palette's groups, in order: Accounts, Actions, Transactions, Holdings, EPF & NPS, Lending, Loans, Upcoming,
 * Reports, Dashboards, Categories, Rules, Tags, Pages, Ask. Pages and Actions filter on the text from its first character; the server
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
        amount={transactionAmount(t)}
        isCredit={rowAmount(t)?.credit ?? false}
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
      id: 'retirement',
      label: 'EPF & NPS',
      items: (server?.retirement ?? []).map((r) =>
        link(`retirement:${r.accountId ?? r.kind}`, retirementTitle(r), retirementHref(r)),
      ),
    },
    {
      id: 'lending',
      label: 'Lending',
      items: (server?.people ?? []).map((p) => link(`lending:${p.id}`, p.name, `/lending/${p.id}`)),
    },
    {
      id: 'loans',
      label: 'Loans',
      items: (server?.loans ?? []).map((l) => link(`loans:${l.id}`, joinTitle([l.name, l.lender]), `/loans/${l.id}`)),
    },
    {
      id: 'upcoming',
      label: 'Upcoming',
      items: (server?.upcoming ?? []).map((u) => ({
        ...link(`upcoming:${u.id}`, joinTitle([u.name, KIND_WORDS[u.kind], `due ${formatDate(u.nextDueOn, 'list')}`]), UPCOMING_HREF),
        trailing: <SearchAmount amount={-u.amount} />,
      })),
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
      id: 'categories',
      label: 'Categories',
      items: (server?.categories ?? []).map((c) => ({
        id: `categories:${c.key}`,
        title: joinTitle([c.name, c.parentName]),
        onSelect: () => go(categoryHref(c)),
      })),
    },
    {
      id: 'rules',
      label: 'Rules',
      items: (server?.rules ?? []).map((r) => link(`rules:${r.id}`, `${r.matchText} → ${r.categoryName}`, RULES_HREF)),
    },
    {
      id: 'tags',
      label: 'Tags',
      items: (server?.tags ?? []).map((t) => ({
        ...link(`tags:${t.id}`, t.name, tagHref(t.id)),
        trailing: (
          <Text as="span" variant="caption" tone="ink-3">
            {formatCount(t.transactionCount, ['transaction', 'transactions'])}
          </Text>
        ),
      })),
    },
    {
      id: 'pages',
      label: 'Pages',
      items: pages
        .filter((p) => matches(p.label, needle) || (p.context !== undefined && matches(p.context, needle)))
        .slice(0, PAGES_CAP)
        .map((p) => ({
          ...link(`pages:${p.id}`, p.label, p.href),
          // Where the page lives sits on the right, so the title stays plain text and keeps its match highlight.
          ...(p.context
            ? {
                trailing: (
                  <Text as="span" variant="caption" tone="ink-3">
                    {p.context}
                  </Text>
                ),
              }
            : {}),
          leading: <Icon name={p.icon} />,
        })),
    },
    {
      id: 'ask',
      label: 'Ask',
      items: text
        ? [{ ...link('ask', `Ask: ${text}`, `/chat?q=${encodeURIComponent(text)}`), leading: <Icon name="chat" /> }]
        : [],
    },
  ];
}
