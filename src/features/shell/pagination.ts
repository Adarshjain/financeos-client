import { first } from './searchParams';

/** The page size of a paged list unless it says otherwise. */
export const DEFAULT_PAGE_SIZE = 25;

type Param = string | string[] | undefined;
type Params = Record<string, Param>;

export interface PageOptions {
  /** The size when the address has none or an unusable one. Default: `DEFAULT_PAGE_SIZE`. */
  size?: number;
  /** The sizes the list offers. Without it any whole number above zero is a size. */
  sizes?: readonly number[];
}

/**
 * The page and size an address asks for. The address counts pages from 1 (`?page=2` is the second page); the
 * returned `page` is the 0-based index the API and the screens use. A missing or unusable page is the first page.
 */
export function parsePage(params: Params, { size: fallback = DEFAULT_PAGE_SIZE, sizes }: PageOptions = {}): {
  page: number;
  size: number;
} {
  const page = Math.floor(Number(first(params.page)));
  const size = Number(first(params.size));
  const usable = sizes ? sizes.includes(size) : Number.isInteger(size) && size > 0;
  return { page: Number.isFinite(page) && page >= 1 ? page - 1 : 0, size: usable ? size : fallback };
}

/** Writes a 0-based page into a query as the address counts it: 1-based, and the first page leaves the key out. */
export function setPageParam(query: URLSearchParams, page: number): void {
  if (page > 0) query.set('page', String(page + 1));
}

/** `base` with `query` and the 0-based `page` (`?page=2` is the second page; the first page has no `page`). */
export function pageHref(base: string, query: URLSearchParams | Record<string, string | undefined> = {}, page = 0): string {
  const out = new URLSearchParams();
  if (query instanceof URLSearchParams) query.forEach((value, key) => out.append(key, value));
  else for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') out.set(key, value);
  setPageParam(out, page);
  const text = out.toString();
  return text ? `${base}?${text}` : base;
}

/** The last page that exists (0-based) when `page` is past it; `page` itself otherwise. With no pages at all, the first. */
export function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(page, 0), Math.max(totalPages - 1, 0));
}
