import React from 'react';

import { SettingsShell } from '@/features/settings/SettingsShell';
import { appLockApi, gmailApi, llmKeysApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';

/** A row value's request, settled to undefined on any failure so the row just shows no value. */
function optional<T>(request: Promise<T>): Promise<T | undefined> {
  return request.catch(() => undefined);
}

export default async function DsSettingsLayout({ children }: { children: React.ReactNode }) {
  // Only the session check blocks: the list renders at once and each row value streams in on its own.
  // A failed value request (a 401 too: the session was just checked, and each section page guards itself)
  // only hides the value; a redirect cannot be sent once the page has started streaming.
  const user = await requireAuth();
  return (
    <SettingsShell
      user={{ displayName: user.displayName, email: user.email }}
      values={{
        appLockArmed: optional(appLockApi.status().then((s) => s.armed)),
        attentionCount: optional(gmailApi.getAttentionItems(0, 1, false).then((a) => a.totalElements)),
        aiKeyCount: optional(llmKeysApi.list().then((k) => k.length)),
      }}
    >
      {children}
    </SettingsShell>
  );
}
