'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { OAUTH_PARAMS, type OauthReturn } from './connectionsModel';

/**
 * The banner for the OAuth callback redirect (`?gmail=success|error`). It keeps the message in
 * state, then removes those params from the URL so a refresh does not show it again.
 */
export function useOauthReturn(oauth: OauthReturn | null) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = oauth ? `${oauth.kind}|${oauth.email ?? ''}|${oauth.message ?? ''}` : '';
  const [shown, setShown] = useState<OauthReturn | null>(oauth);
  const [seenKey, setSeenKey] = useState(key);
  if (key !== seenKey) {
    setSeenKey(key);
    if (oauth) setShown(oauth);
  }

  useEffect(() => {
    if (!key) return;
    const next = new URLSearchParams(searchParams?.toString() ?? '');
    OAUTH_PARAMS.forEach((p) => next.delete(p));
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    // Only when a new return arrives; the params are gone from the URL afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { banner: shown, dismiss: () => setShown(null) };
}
