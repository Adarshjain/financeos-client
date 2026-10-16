import { redirect } from 'next/navigation';
import React, { Suspense } from 'react';

import { getOptionalSession } from '@/lib/auth';

import { LoginForm } from './LoginForm';

export default async function DsLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; deleted?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const session = await getOptionalSession();
  if (session) {
    const from = params?.from;
    const dest =
      from && from.startsWith('/') && !from.startsWith('//')
        ? from
        : '/dashboard';
    redirect(dest);
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
