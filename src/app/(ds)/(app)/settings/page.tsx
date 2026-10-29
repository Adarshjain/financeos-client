import React from 'react';

import { ProfileScreen } from '@/features/settings/profile/ProfileScreen';
import { guardSession } from '@/features/shell/loadHelpers';
import { appLockApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';

export const metadata = { title: 'Settings' };

export default async function DsSettingsProfilePage() {
  // The session check and the app-lock status are independent, so they run together.
  const [user, appLock] = await Promise.all([requireAuth(), guardSession(appLockApi.status())]);
  return <ProfileScreen user={user} appLock={appLock} />;
}
