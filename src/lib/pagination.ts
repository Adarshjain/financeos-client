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

/** A slot in a numbered pager: a 0-based page index, or an elided run of pages. */
export type PageItem = number | 'gap';

/**
 * The page buttons to show for `current` of `total` (both 0-based / counts):
 * always the first and last page, `siblings` pages either side of the current
 * one, and a gap wherever pages are skipped. The slot count stays fixed
 * (`2 * siblings + 5`) as the current page moves, so the pager never jumps
 * width while you click through it.
 */
export function pageItems(
  current: number,
  total: number,
  siblings = 1
): PageItem[] {
  const slots = 2 * siblings + 5;
  if (total <= slots) return Array.from({ length: total }, (_, i) => i);

  const last = total - 1;
  // Pages shown in a row next to whichever end the current page is near.
  const run = slots - 2;
  if (current <= siblings + 2) {
    return [...Array.from({ length: run }, (_, i) => i), 'gap', last];
  }
  if (current >= last - siblings - 2) {
    return [
      0,
      'gap',
      ...Array.from({ length: run }, (_, i) => total - run + i),
    ];
  }
  return [
    0,
    'gap',
    ...Array.from(
      { length: 2 * siblings + 1 },
      (_, i) => current - siblings + i
    ),
    'gap',
    last,
  ];
}
