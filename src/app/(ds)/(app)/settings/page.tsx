import React from 'react';

import { SettingsMain } from '@/features/settings/SettingsMain';
import { guardSession } from '@/features/shell/loadHelpers';
import { readTabSlot } from '@/features/shell/tabSlotCookie';
import { appLockApi, llmKeysApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';

export const metadata = { title: 'Settings' };

/** A row value's request, settled to undefined on any failure so the row just shows no value. */
function optional<T>(request: Promise<T>): Promise<T | undefined> {
  return request.catch(() => undefined);
}

export default async function DsSettingsPage() {
  // The profile and app lock status block; the AI value streams in on their own and a
  // failed request only hides its value.
  const [user, appLock] = await Promise.all([requireAuth(), guardSession(appLockApi.status())]);
  return (
    <SettingsMain
      user={user}
      appLock={appLock}
      tabSlot={await readTabSlot()}
      values={{
        aiKeyCount: optional(llmKeysApi.list().then((k) => k.length)),
      }}
    />
  );
}
