import { first, type SearchParamsRecord } from '@/features/shell/searchParams';

import { type OauthReturn, oauthReturnFrom } from './connectionsModel';

export interface ConnectionsUrl {
  /** What the Google consent screen sent back (`?gmail=`, `?email=`, `?message=`). */
  oauth: OauthReturn | null;
  /** `?focus=attention` scrolls to the needs-attention card. */
  focusAttention: boolean;
}

/** What a /settings/connections address asks for. */
export function parseConnectionsUrl(params: SearchParamsRecord): ConnectionsUrl {
  return {
    oauth: oauthReturnFrom({ gmail: first(params.gmail), email: first(params.email), message: first(params.message) }),
    focusAttention: first(params.focus) === 'attention',
  };
}
