import { formatDayMonth, formatRupees } from '@/features/accounts/list/accountsList';
import type { Category } from '@/lib/categories.types';
import type { Transaction } from '@/lib/transaction.types';

import type { UncategorizedRow } from './UncategorizedCard';

export const CATEGORIES_PAGE_SIZE = 20;

export interface CategoriesUrlState {
  q: string;
  /** 0-based. */
  page: number;
}

type Raw = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? '').trim();

/** The search text and page the address stands for; anything invalid falls back to none and the first page. */
export function parseCategoriesUrl(params: Raw): CategoriesUrlState {
  const page = Math.floor(Number(first(params.page)));
  return { q: first(params.q), page: Number.isFinite(page) && page > 0 ? page : 0 };
}

export function categoriesUrl({ q, page }: CategoriesUrlState): string {
  const out = new URLSearchParams();
  if (q) out.set('q', q);
  if (page > 0) out.set('page', String(page));
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
  return categoriesUrl({ q: state.q, page: page.totalPages - 1 });
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
      detail: `${formatDayMonth(t.date)} · ${formatRupees(Math.abs(t.amount))}`,
    })),
  };
}
