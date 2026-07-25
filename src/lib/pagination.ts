/**
 * The backend's paged-response envelope (a Spring `Page`).
 *
 * `PagedTransaction`, `PagedRules` and `PagedInvestmentTransactionResponse`
 * each repeated these eight fields verbatim in three different files, so no
 * shared pagination helper could be written against them and a backend change
 * meant editing three places with nothing to catch a divergence.
 *
 * Distinct from `TablePage` in `reports.types`, which is a deliberately smaller
 * view-model for the report table footer rather than an API envelope — that one
 * is not a duplicate and stays as it is.
 */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
