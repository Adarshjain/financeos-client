import { first, type SearchParamsRecord } from '@/features/shell/searchParams';

/** What a /reports/new address asks for: `?template=` starts the draft from a template. */
export function parseNewReportUrl(params: SearchParamsRecord): { template: string | undefined } {
  return { template: first(params.template) };
}
