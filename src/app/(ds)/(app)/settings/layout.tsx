import React from 'react';

import { SettingsShell } from '@/features/settings/SettingsShell';
import { orNull } from '@/features/shell/loadHelpers';
import { appLockApi, gmailApi, llmKeysApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';

export default async function DsSettingsLayout({ children }: { children: React.ReactNode }) {
  // The row values are optional: a failing request only hides its value (a 401 still sends the visitor to sign in).
  const [user, appLock, attention, llmKeys] = await Promise.all([
    requireAuth(),
    orNull(appLockApi.status()),
    orNull(gmailApi.getAttentionItems(0, 1, false)),
    orNull(llmKeysApi.list()),
  ]);
  return (
    <SettingsShell
      user={{ displayName: user.displayName, email: user.email }}
      values={{
        appLockArmed: appLock?.armed,
        attentionCount: attention?.totalElements,
        aiKeyCount: llmKeys?.length,
      }}
    >
      {children}
    </SettingsShell>
  );
}
