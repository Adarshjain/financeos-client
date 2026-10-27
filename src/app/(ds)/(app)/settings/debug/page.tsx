import React from 'react';

import { DebugView } from '@/features/settings/debug/DebugView';
import { requireAuth } from '@/lib/auth';

interface DsSettingsDebugProps {
  searchParams: Promise<{ ref?: string; type?: string }>;
}

export default async function DsSettingsDebugPage({ searchParams }: DsSettingsDebugProps) {
  const user = await requireAuth();
  const params = await searchParams;

  return <DebugView initialRef={params.ref} initialType={params.type} admin={Boolean(user.admin)} />;
}
