import { first, type SearchParamsRecord } from '@/features/shell/searchParams';

export interface ImportUrl {
  /** `?type=epf` opens on the EPF passbook; anything else keeps the default. */
  initialMode: 'epf_passbook' | undefined;
}

/** What an /investments/import address asks for. */
export function parseImportUrl(params: SearchParamsRecord): ImportUrl {
  return { initialMode: first(params.type) === 'epf' ? 'epf_passbook' : undefined };
}
