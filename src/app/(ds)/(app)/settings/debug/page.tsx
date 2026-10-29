import React from 'react';

import { parseDebugUrl } from '@/features/settings/debug/debugUrl';
import { DebugView } from '@/features/settings/debug/DebugView';
import type { SearchParams } from '@/features/shell/searchParams';
import { requireAuth } from '@/lib/auth';

export const metadata = { title: 'Debug' };

export default async function DsSettingsDebugPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAuth();
  const { initialRef, initialType } = parseDebugUrl(await searchParams);
  return <DebugView initialRef={initialRef} initialType={initialType} admin={Boolean(user.admin)} />;
}
