/** The two tabs of Loans & lendings, Lendings first. `href` is the Dinero route. */
import { appHref } from '@/features/shell/routes';

export interface LoansLendingsTab {
  id: 'lendings' | 'loans';
  label: string;
  /** Top-bar title on this tab (as the boards draw it). */
  title: string;
  href: string;
}

export const LENDINGS_HREF = appHref('/loans/lendings');
export const LOANS_HREF = appHref('/loans');

export const loansLendingsTabs: LoansLendingsTab[] = [
  { id: 'lendings', label: 'Lendings', title: 'Lendings', href: LENDINGS_HREF },
  { id: 'loans', label: 'Loans', title: 'Loans & lendings', href: LOANS_HREF },
];

/** The tab a pathname belongs to; anything outside /loans/lendings counts as Loans. */
export function activeLoansLendingsTab(pathname: string | null | undefined): LoansLendingsTab {
  const path = (pathname ?? '').replace(/\/+$/, '');
  if (path === LENDINGS_HREF || path.startsWith(`${LENDINGS_HREF}/`)) return loansLendingsTabs[0];
  return loansLendingsTabs[1];
}
