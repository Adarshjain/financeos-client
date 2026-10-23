'use client';

import React, { useState } from 'react';

import { logoutToDinero } from '@/actions/auth';
import { Banner, Button, Text } from '@/components/ds';
import { Logo } from '@/components/organisms';
import { appHref } from '@/features/shell/routes';

import { finishUnlock, startUnlock } from './actions';
import { credentialToJSON, toRequestOptions } from './webauthn';

const TRY_AGAIN = "Couldn't verify. Try again.";
const CANT_UNLOCK = "Can't unlock? Sign out, sign in with your password, then turn off App lock in Settings.";

/** The lock screen: one tap (Safari needs a gesture) opens the passkey prompt; a good answer returns to `from`. */
export function LockScreen({ from }: { from: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toSignIn = () => window.location.replace(appHref('/login'));

  const unlock = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const options = await startUnlock();
      if (!options.success) {
        if (options.error.code === 'UNAUTHORIZED') return toSignIn();
        setError(options.error.code === 'APP_LOCK_DEVICE_MISSING' ? CANT_UNLOCK : TRY_AGAIN);
        return;
      }
      const credential = (await navigator.credentials.get({
        publicKey: toRequestOptions(options.data),
      })) as PublicKeyCredential | null;
      if (!credential) {
        setError(TRY_AGAIN);
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
    } catch {
      setError(TRY_AGAIN);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-space-20 desk:p-space-40">
      <div className="w-full max-w-sm flex flex-col items-center gap-space-16 text-center">
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
        <Button variant="primary" size="xl" fullWidth loading={busy} loadingLabel="Checking…" onClick={unlock}>
          Unlock
        </Button>
        <Button variant="link" onClick={() => void logoutToDinero()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
