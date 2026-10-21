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

/** A loan's own page (`/ds/loans/<id>`): it carries its own top bar and sits outside the tab frame. */
export function isLoanDetailPath(pathname: string | null | undefined): boolean {
  const path = (pathname ?? '').replace(/\/+$/, '');
  if (!path.startsWith(`${LOANS_HREF}/`)) return false;
  const rest = path.slice(LOANS_HREF.length + 1);
  return rest !== '' && !rest.includes('/') && rest !== 'lendings';
}

/** A person's own page (`/ds/loans/lendings/<id>`): like a loan's page it carries its own top bar, outside the tab frame. */
export function isPersonDetailPath(pathname: string | null | undefined): boolean {
  const path = (pathname ?? '').replace(/\/+$/, '');
  if (!path.startsWith(`${LENDINGS_HREF}/`)) return false;
  const rest = path.slice(LENDINGS_HREF.length + 1);
  return rest !== '' && !rest.includes('/');
}
