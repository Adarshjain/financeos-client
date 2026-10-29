import { first, type SearchParamsRecord } from '@/features/shell/searchParams';

export interface StatementsUrl {
  /** The financial year chosen in the address. */
  fy?: string;
  /** The statement chosen in the address. */
  statement?: string;
}

/** What a Statements tab address asks for: `?fy=` and `?statement=`. */
export function parseStatementsUrl(params: SearchParamsRecord): StatementsUrl {
  return { fy: first(params.fy), statement: first(params.statement) };
}
