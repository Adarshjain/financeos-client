'use client';

import { useEffect, useRef, useState } from 'react';

import { showToast } from '@/components/ds';

import { fetchDeployedVersion, isChunkLoadError } from './newVersion';

export const VERSION_CHECK_INTERVAL_MS = 10 * 60 * 1000;
/** Focus and visibilitychange usually fire together; one check covers both. */
const MIN_GAP_MS = 5000;
const TOAST_ID = 'new-version';

/**
 * Tells an open tab that a newer deploy exists: a persistent "New version available / Reload" toast, shown
 * once. `loadedVersion` is the build id the server rendered this page with. Nothing is fetched on load; the
 * check runs when the tab regains focus and every 10 minutes. A failed lazy chunk load (the old deploy's
 * files are gone) counts as a new version too.
 */
export function NewVersionWatcher({ loadedVersion: renderedVersion }: { loadedVersion: string }) {
  // The first value is the one this tab's code was loaded with; a refresh after a deploy renders a newer id.
  const [loadedVersion] = useState(renderedVersion);
  const shown = useRef(false);
  const inFlight = useRef(false);
  const lastCheck = useRef(0);

  useEffect(() => {
    const announce = () => {
      if (shown.current) return;
      shown.current = true;
      showToast('New version available', {
        id: TOAST_ID,
        duration: Infinity,
        action: { label: 'Reload', onSelect: () => window.location.reload() },
      });
    };

    const check = async () => {
      if (shown.current || inFlight.current) return;
      if (Date.now() - lastCheck.current < MIN_GAP_MS) return;
      inFlight.current = true;
      lastCheck.current = Date.now();
      try {
        const deployed = await fetchDeployedVersion();
        if (deployed && deployed !== loadedVersion) announce();
      } finally {
        inFlight.current = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check();
    };
    const onChunkError = (e: ErrorEvent) => {
      if (loadedVersion !== 'dev' && isChunkLoadError(e.error ?? { message: e.message })) announce();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (loadedVersion !== 'dev' && isChunkLoadError(e.reason)) announce();
    };

    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('error', onChunkError);
    window.addEventListener('unhandledrejection', onRejection);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void check();
    }, VERSION_CHECK_INTERVAL_MS);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('error', onChunkError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.clearInterval(timer);
    };
  }, [loadedVersion]);

  return null;
}
