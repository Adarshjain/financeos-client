import React from 'react';

import { requireAuth } from '@/lib/auth';

import { DebugPage } from './DebugPage';

interface DebugRouteProps {
  searchParams: Promise<{
    ref?: string;
    type?: string;
  }>;
}

export default async function DebugRoute({ searchParams }: DebugRouteProps) {
  const user = await requireAuth();
  const params = await searchParams;

  return (
    <DebugPage
      initialRef={params.ref}
      initialType={params.type}
      admin={Boolean(user.admin)}
    />
  );
}
