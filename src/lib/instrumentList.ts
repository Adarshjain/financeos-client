import type { InstrumentType } from '@/lib/types';

/** GET /instruments pages the catalog: `size` defaults to 50 and is capped at 200 by the server. */
export const INSTRUMENT_PAGE_SIZE = 50;
export const INSTRUMENT_MAX_PAGE_SIZE = 200;
export const INSTRUMENT_PAGE_SIZES = [25, 50, 100, 200];

export interface InstrumentListParams {
  search?: string;
  type?: InstrumentType;
  page?: number;
  size?: number;
}

export interface InstrumentListQuery {
  search?: string;
  type?: InstrumentType;
  page: number;
  size: number;
}

/**
 * The normalised request (and cache key) for one page of the catalog, so the server prefetch and
 * the client hook land on the same query: blank search dropped, page ≥ 0, size within the server cap.
 */
export function instrumentListQuery(params: InstrumentListParams = {}): InstrumentListQuery {
  const search = params.search?.trim() || undefined;
  const page = Math.max(0, Math.floor(params.page ?? 0));
  const size = Math.min(INSTRUMENT_MAX_PAGE_SIZE, Math.max(1, Math.floor(params.size ?? INSTRUMENT_PAGE_SIZE)));
  return {
    ...(search ? { search } : {}),
    ...(params.type ? { type: params.type } : {}),
    page,
    size,
  };
}

/**
 * The endpoint returns a bare list with no total, so a page that came back full may have a next
 * one (the first page can also carry the user's own renamed matches on top of `size`).
 */
export function hasNextInstrumentPage(rowCount: number, size: number): boolean {
  return rowCount >= size;
}
