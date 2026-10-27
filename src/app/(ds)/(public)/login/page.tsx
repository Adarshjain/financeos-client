import { redirect } from 'next/navigation';
import React, { Suspense } from 'react';

import { appHref, isSafeLocalPath } from '@/features/shell/routes';
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
      from && isSafeLocalPath(from) ? from : '/dashboard';
    redirect(appHref(dest));
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
