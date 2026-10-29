'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useRef, useState } from 'react';

import { logoutToDinero } from '@/actions/auth';
import { Banner, Button, Text } from '@/components/ds';
import { Logo } from '@/components/organisms';
import { appHref } from '@/features/shell/routes';

import { finishUnlock, startUnlock } from './appLockActions';
import { credentialToJSON, toRequestOptions } from './webauthn';

const TRY_AGAIN = "Couldn't verify. Try again.";
const CANT_UNLOCK = "Can't unlock? Sign out, sign in with your password, then turn off App lock in Settings.";

/** Back in the app after this long away: prompt again on its own. */
const REPROMPT_AFTER_MS = 2000;

const UNLOCK_KEY = ['app-lock', 'unlock'];

/**
 * The lock screen: the passkey prompt opens on its own when the screen shows and when the app comes back to the
 * front; Unlock opens it again (Safari needs a tap, so there the automatic try fails quietly). A good answer
 * returns to `from`.
 */
export function LockScreen({ from }: { from: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const toSignIn = () => window.location.replace(appHref('/login'));

  /** `auto`: opened without a tap; a dismissed or refused prompt then leaves the screen as it was. */
  const unlockMutation = useMutation({
    mutationKey: UNLOCK_KEY,
    mutationFn: async (auto: boolean) => {
      const options = await startUnlock();
      if (!options.success) {
        if (options.error.code === 'UNAUTHORIZED') return toSignIn();
        setError(options.error.code === 'APP_LOCK_DEVICE_MISSING' ? CANT_UNLOCK : TRY_AGAIN);
        return;
      }
      let credential: PublicKeyCredential | null;
      try {
        credential = (await navigator.credentials.get({
          publicKey: toRequestOptions(options.data),
        })) as PublicKeyCredential | null;
      } catch (e) {
        if (auto) return;
        throw e;
      }
      if (!credential) {
        if (!auto) setError(TRY_AGAIN);
        return;
      }
      const verified = await finishUnlock(credentialToJSON(credential));
      if (verified.success) {
        window.location.replace(from);
        return;
      }
      // A wrong answer comes back as APP_LOCK_UNLOCK_FAILED (data); only the last allowed try ends the session.
      if (verified.error.code === 'UNAUTHORIZED') return toSignIn();
      setError(TRY_AGAIN);
    },
    onError: () => setError(TRY_AGAIN),
  });
  const busy = unlockMutation.isPending;

  const unlock = (auto = false) => {
    // The cache answers at once, before a render could show the pending state: two triggers in a row open one prompt.
    if (queryClient.isMutating({ mutationKey: UNLOCK_KEY }) > 0) return;
    setError(null);
    unlockMutation.mutate(auto);
  };

  const unlockRef = useRef(unlock);
  useEffect(() => {
    unlockRef.current = unlock;
  });

  useEffect(() => {
    unlockRef.current(true);
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      // The OS prompt itself can hide the page for a moment; only a real trip away prompts again.
      if (hiddenAt !== null && Date.now() - hiddenAt >= REPROMPT_AFTER_MS) unlockRef.current(true);
      hiddenAt = null;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <div className="min-h-dvh flex items-center justify-center p-space-20 desk:p-space-40">
      <div className="w-full max-w-sm flex flex-col items-center gap-space-8 desk:gap-space-16 text-center">
        <Logo />
        <div className="flex flex-col gap-space-8">
          <Text as="h1" variant="page-title" family="display" align="center">
            FinanceOS is locked
          </Text>
          <Text variant="body" tone="ink-3" align="center">
            Use Face ID or your fingerprint to open the app.
          </Text>
        </div>
        {error && (
          <Banner tone="danger">
            <div className="flex flex-col gap-space-4">
              {error !== CANT_UNLOCK && <span>{error}</span>}
              <span>{CANT_UNLOCK}</span>
            </div>
          </Banner>
        )}
        <Button variant="primary" size="xl" fullWidth loading={busy} loadingLabel="Checking…" onClick={() => unlock()}>
          Unlock
        </Button>
        <Button variant="link" size="sm" onClick={() => void logoutToDinero()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
