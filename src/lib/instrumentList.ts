import type { Instrument, InstrumentType } from '@/lib/types';

/** GET /instruments pages the catalog: `size` defaults to 50 and is capped at 200 by the server. */
export const INSTRUMENT_PAGE_SIZE = 50;
export const INSTRUMENT_MAX_PAGE_SIZE = 200;
export const INSTRUMENT_PAGE_SIZES = [25, 50, 100, 200];

/** Name order of the list (the name the user sees, case-insensitive on the server). */
export type InstrumentSortDir = 'asc' | 'desc';

/** One page of GET /instruments, with the total over all pages. */
export interface InstrumentListPage {
  items: Instrument[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface InstrumentListParams {
  search?: string;
  type?: InstrumentType;
  sortDir?: InstrumentSortDir;
  page?: number;
  size?: number;
}

export interface InstrumentListQuery {
  search?: string;
  type?: InstrumentType;
  /** `name,desc` only: the server's default is `name,asc`, so ascending sends no sort. */
  sort?: 'name,desc';
  page: number;
  size: number;
}

/**
 * The normalised request (and cache key) for one page of the catalog, so the server prefetch and
 * the client hook land on the same query: blank search dropped, page ≥ 0, size within the server cap,
 * sort sent only when it differs from the server's default (name ascending).
 */
export function instrumentListQuery(params: InstrumentListParams = {}): InstrumentListQuery {
  const search = params.search?.trim() || undefined;
  const page = Math.max(0, Math.floor(params.page ?? 0));
  const size = Math.min(INSTRUMENT_MAX_PAGE_SIZE, Math.max(1, Math.floor(params.size ?? INSTRUMENT_PAGE_SIZE)));
  return {
    ...(search ? { search } : {}),
    ...(params.type ? { type: params.type } : {}),
    ...(params.sortDir === 'desc' ? { sort: 'name,desc' as const } : {}),
    page,
    size,
  };
}
