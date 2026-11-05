import { first, type SearchParamsRecord } from '@/features/shell/searchParams';

import type { ImportMode } from './types';

export interface ImportUrl {
  /** `?type=epf` opens on the EPF passbook, `?type=nps` on the NPS statement; anything else keeps the default. */
  initialMode: Extract<ImportMode, 'epf_passbook' | 'nps_statement'> | undefined;
}

/** What an /investments/import address asks for. */
export function parseImportUrl(params: SearchParamsRecord): ImportUrl {
  const type = first(params.type);
  return { initialMode: type === 'epf' ? 'epf_passbook' : type === 'nps' ? 'nps_statement' : undefined };
}
