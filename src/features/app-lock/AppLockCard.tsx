'use client';

import { useMutation } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';

import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Select } from '@/components/ds/Select/Select';
import { Switch } from '@/components/ds/Switch/Switch';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import type { AppLockStatus } from '@/lib/api/types';
import { APP_LOCK_CHANGED_EVENT, notifyIfAppLocked } from '@/lib/appLock';

import { disableAppLock, finishEnrolment, startEnrolment, startUnlock, updateLockAfter } from './appLockActions';
import {
  credentialToJSON,
  hostMatchesRp,
  isCancelled,
  isPlatformAuthAvailable,
  toCreationOptions,
  toRequestOptions,
} from './webauthn';

const LOCK_AFTER_OPTIONS = [
  { value: '0', label: 'Immediately' },
  { value: '60', label: '1 minute' },
  { value: '300', label: '5 minutes' },
  { value: '900', label: '15 minutes' },
];

const DEFAULT_LOCK_AFTER = '60';

type Support = 'checking' | 'ok' | 'no-platform' | 'wrong-host';

const SUBTITLE: Record<Support, string> = {
  checking: 'Asks for it when you open the installed app',
  ok: 'Asks for it when you open the installed app',
  'no-platform': 'This device has no Face ID or fingerprint to use',
  'wrong-host': 'Open FinanceOS at its usual address to turn this on',
};

/** Direct action calls bypass the query cache, so a locked answer is raised here. */
function seen<T>(result: T): T {
  notifyIfAppLocked(result);
  return result;
}

function announce() {
  window.dispatchEvent(new CustomEvent(APP_LOCK_CHANGED_EVENT));
}

/** Per-device app lock: a passkey (Face ID, fingerprint or device passcode) asked for after the chosen idle time. */
export function AppLockCard({ status }: { status: AppLockStatus }) {
  const [armed, setArmed] = useState(status.armed);
  const [lockAfter, setLockAfter] = useState(String(status.lockAfterSeconds ?? DEFAULT_LOCK_AFTER));
  const [support, setSupport] = useState<Support>('checking');

  useEffect(() => {
    let live = true;
    void (async () => {
      const next: Support = !hostMatchesRp(status.rpId)
        ? 'wrong-host'
        : (await isPlatformAuthAvailable())
          ? 'ok'
          : 'no-platform';
      if (live) setSupport(next);
    })();
    return () => {
      live = false;
    };
  }, [status.rpId]);

  const turnOn = async () => {
    const started = seen(await startEnrolment(Number(lockAfter)));
    if (!started.success) return showToast(started.error.message, { tone: 'danger' });
    try {
      const credential = (await navigator.credentials.create({
        publicKey: toCreationOptions(started.data),
      })) as PublicKeyCredential | null;
      if (!credential) return;
      const done = seen(await finishEnrolment(credentialToJSON(credential)));
      if (!done.success) return showToast(done.error.message, { tone: 'danger' });
      setArmed(true);
      announce();
    } catch (e) {
      // Dismissing the prompt is not an error worth a toast.
      if (!isCancelled(e)) showToast("Couldn't turn on app lock. Try again.", { tone: 'danger' });
    }
  };

  const turnOff = async () => {
    // Turning the lock off asks for the passkey again, so a borrowed unlocked phone cannot drop it.
    const started = seen(await startUnlock());
    if (!started.success) return showToast(started.error.message, { tone: 'danger' });
    try {
      const credential = (await navigator.credentials.get({
        publicKey: toRequestOptions(started.data),
      })) as PublicKeyCredential | null;
      if (!credential) return;
      const done = seen(await disableAppLock(credentialToJSON(credential)));
      if (!done.success) return showToast(done.error.message, { tone: 'danger' });
      setArmed(false);
      announce();
    } catch (e) {
      if (!isCancelled(e)) showToast("Couldn't turn off app lock. Try again.", { tone: 'danger' });
    }
  };

  const toggleMutation = useMutation({ mutationFn: (next: boolean) => (next ? turnOn() : turnOff()) });
  const busy = toggleMutation.isPending;
  const onToggle = (next: boolean) => {
    if (busy) return;
    toggleMutation.mutate(next);
  };

  const onLockAfter = async (value: string | string[]) => {
    const next = Array.isArray(value) ? value[0] : value;
    if (!next || next === lockAfter) return;
    const previous = lockAfter;
    setLockAfter(next);
    const done = seen(await updateLockAfter(Number(next)));
    if (!done.success) {
      setLockAfter(previous);
      return showToast(done.error.message, { tone: 'danger' });
    }
    announce();
  };

  // A device that cannot enrol can still turn an existing lock off.
  const canToggle = armed || support === 'ok';

  return (
    <Card title="App lock" subtitle="Saved on this device">
      <ListRow
        title={<Text variant="body">Unlock with Face ID or fingerprint</Text>}
        subtitle={SUBTITLE[armed ? 'ok' : support]}
        trailing={
          <Switch
            aria-label="Unlock with Face ID or fingerprint"
            checked={armed}
            disabled={busy || !canToggle}
            onCheckedChange={onToggle}
          />
        }
      />
      {armed && (
        <ListRow
          title={<Text variant="body">Lock after</Text>}
          trailing={
            <Select
              aria-label="Lock after"
              size="sm"
              options={LOCK_AFTER_OPTIONS}
              value={lockAfter}
              onValueChange={(v) => void onLockAfter(v)}
            />
          }
        />
      )}
    </Card>
  );
}
