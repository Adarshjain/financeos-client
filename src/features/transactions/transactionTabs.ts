import { appHref } from '@/features/shell/routes';

export type TransactionsTabId = 'all' | 'rules';

/** The two tabs of Transactions, in order. `href` is a plain path; `appHref` turns it into the route. */
export const TRANSACTION_TABS: { value: TransactionsTabId; label: string; href: string }[] = [
  { value: 'all', label: 'All', href: '/transactions' },
  { value: 'rules', label: 'Tags', href: '/transactions/tags' },
];

/** The tab a pathname belongs to (`/transactions/tags` is Tags); anything else, the import pages included, is All. */
export function activeTransactionsTab(pathname: string | null | undefined): TransactionsTabId {
  const path = (pathname ?? '').replace(/\/+$/, '');
  const match = TRANSACTION_TABS.filter((t) => t.value !== 'all').find((t) => {
    const href = appHref(t.href);
    return path === href || path.startsWith(`${href}/`);
  });
  return match?.value ?? 'all';
}
