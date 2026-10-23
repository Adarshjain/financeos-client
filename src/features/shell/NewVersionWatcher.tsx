'use client';

import { useEffect, useRef, useState } from 'react';

import { Banner, cn, Reveal } from '@/components/ds';

import { fetchDeployedVersion, isChunkLoadError } from './newVersion';

export const VERSION_CHECK_INTERVAL_MS = 10 * 60 * 1000;
/** Focus and visibilitychange usually fire together; one check covers both. */
const MIN_GAP_MS = 5000;

/**
 * Tells an open tab that a newer deploy exists: a full-width "New version available" banner above the shell
 * with Refresh and dismiss, shown once (a dismiss lasts for the tab). It slides down from the top and back up. `loadedVersion` is the build id the server rendered this page with. Nothing is fetched on load; the
 * check runs when the tab regains focus and every 10 minutes. A failed lazy chunk load (the old deploy's
 * files are gone) counts as a new version too.
 */
export function NewVersionWatcher({ loadedVersion: renderedVersion }: { loadedVersion: string }) {
  // The first value is the one this tab's code was loaded with; a refresh after a deploy renders a newer id.
  const [loadedVersion] = useState(renderedVersion);
  const [announced, setAnnounced] = useState(false);
  const [visible, setVisible] = useState(false);
  const shown = useRef(false);
  const inFlight = useRef(false);
  const lastCheck = useRef(0);

  useEffect(() => {
    const announce = () => {
      if (shown.current) return;
      shown.current = true;
      setAnnounced(true);
      setVisible(true);
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

  // Reveal and the slide wrapper stay mounted so both directions animate; the banner stays after a dismiss
  // only to slide out. The data attribute (the layout's notch hand-off) is on only while it shows.
  return (
    <Reveal open={visible} data-new-version-banner={visible || undefined}>
      <div
        className={cn(
          'transition-transform duration-base motion-reduce:transition-none',
          visible ? 'translate-y-0' : '-translate-y-full'
        )}
      >
        {announced ? (
          <Banner
            tone="info"
            variant="page-top"
            action={{ label: 'Refresh', onSelect: () => window.location.reload() }}
            onDismiss={() => setVisible(false)}
          >
            New version available
          </Banner>
        ) : null}
      </div>
    </Reveal>
  );
}
