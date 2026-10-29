import React from 'react';

import { DebugScreen } from '@/features/settings/debug/DebugScreen';
import { parseDebugUrl } from '@/features/settings/debug/debugUrl';
import type { SearchParams } from '@/features/shell/searchParams';
import { requireAuth } from '@/lib/auth';

export const metadata = { title: 'Debug' };

export default async function DsSettingsDebugPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAuth();
  const { initialRef, initialType } = parseDebugUrl(await searchParams);
  return <DebugScreen initialRef={initialRef} initialType={initialType} admin={Boolean(user.admin)} />;
}
