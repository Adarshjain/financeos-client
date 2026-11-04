import React from 'react';

import { requireAuth } from '@/lib/auth';

import { ProfileScreen } from './ProfileScreen';

/** The Profile section: served at /settings (desktop opens it) and at /settings/profile. */
export async function ProfilePage() {
  return <ProfileScreen user={await requireAuth()} />;
}
