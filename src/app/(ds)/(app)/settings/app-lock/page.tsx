import React from 'react';

import { AppLockCard } from '@/features/app-lock/AppLockCard';
import { guardSession } from '@/features/shell/loadHelpers';
import { appLockApi } from '@/lib/apiClient';

export const metadata = { title: 'App lock' };

export default async function DsSettingsAppLockPage() {
  return <AppLockCard status={await guardSession(appLockApi.status())} />;
}
