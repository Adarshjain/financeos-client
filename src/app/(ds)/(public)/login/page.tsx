import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import React, { Suspense } from 'react';

import { parseLoginUrl } from '@/features/auth/loginUrl';
import type { SearchParams } from '@/features/shell/searchParams';
import { getOptionalSession } from '@/lib/auth';

import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function DsLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { destination } = parseLoginUrl(await searchParams);
  const session = await getOptionalSession();
  if (session) redirect(destination);

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
