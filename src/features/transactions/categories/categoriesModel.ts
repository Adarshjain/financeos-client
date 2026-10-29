import { clampPage, parsePage, setPageParam } from '@/features/shell/pagination';
import { first, type SearchParamsRecord } from '@/features/shell/searchParams';
import type { Category } from '@/lib/categories.types';
import { formatDate, formatMoney } from '@/lib/format';
import type { Transaction } from '@/lib/transaction.types';

import type { UncategorizedRow } from './UncategorizedCard';

export const CATEGORIES_PAGE_SIZE = 20;

export interface CategoriesUrlState {
  q: string;
  /** 0-based. */
  page: number;
}

const trimmed = (v: string | string[] | undefined) => (first(v) ?? '').trim();

/** The search text and page the address stands for; anything invalid falls back to none and the first page. */
export function parseCategoriesUrl(params: SearchParamsRecord): CategoriesUrlState {
  return { q: trimmed(params.q), page: parsePage(params).page };
}

export function categoriesUrl({ q, page }: CategoriesUrlState): string {
  const out = new URLSearchParams();
  if (q) out.set('q', q);
  setPageParam(out, page);
  const text = out.toString();
  return text ? `?${text}` : '?';
}

export interface UncategorizedData {
  count: number;
  /** The latest few, in full: Tag opens Set category on one. */
  transactions: Transaction[];
  rows: UncategorizedRow[];
  reviewHref: string;
}

/** Where to go instead when the page asked for is past the last one (a stale address, or the last row of the last page deleted); null when it is fine. */
export function clampedCategoriesUrl(state: CategoriesUrlState, page: { content: unknown[]; totalPages: number }): string | null {
  if (page.content.length > 0 || page.totalPages === 0 || state.page < page.totalPages) return null;
  return categoriesUrl({ q: state.q, page: clampPage(state.page, page.totalPages) });
}

export interface CategoriesPage {
  rows: Category[];
  totalElements: number;
  totalPages: number;
}

/** The Uncategorized card's data from the latest transactions with no category; null when there are none. */
export function uncategorizedData(
  page: { content: Transaction[]; totalElements: number },
  reviewHref: string,
): UncategorizedData | null {
  if (page.totalElements === 0) return null;
  return {
    count: page.totalElements,
    transactions: page.content,
    reviewHref,
    rows: page.content.map((t) => ({
      id: t.id,
      description: t.description || t.sourcedDescription || '—',
      detail: `${formatDate(t.date, 'list')} · ${formatMoney(Math.abs(t.amount), { decimals: 'exact' })}`,
    })),
  };
}
