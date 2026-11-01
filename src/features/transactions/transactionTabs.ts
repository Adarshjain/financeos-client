import { appHref } from '@/features/shell/routes';

export type TransactionsTabId = 'all' | 'rules' | 'import';

/** The three tabs of Transactions, in order. `href` is a plain path; `appHref` turns it into the route. */
export const TRANSACTION_TABS: { value: TransactionsTabId; label: string; href: string }[] = [
  { value: 'all', label: 'All', href: '/transactions' },
  { value: 'rules', label: 'Tags', href: '/rules' },
  { value: 'import', label: 'Import', href: '/transactions/import' },
];

/** The tab a pathname belongs to (`/transactions/rules` is Tags, an import's own page is Import); anything else is All. */
export function activeTransactionsTab(pathname: string | null | undefined): TransactionsTabId {
  const path = (pathname ?? '').replace(/\/+$/, '');
  const match = TRANSACTION_TABS.filter((t) => t.value !== 'all').find((t) => {
    const href = appHref(t.href);
    return path === href || path.startsWith(`${href}/`);
  });
  return match?.value ?? 'all';
}
