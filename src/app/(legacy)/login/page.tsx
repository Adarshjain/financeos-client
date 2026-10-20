import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getOptionalSession } from '@/lib/auth';

import { LoginForm } from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; deleted?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  // If user already has valid session, redirect to requested path or dashboard
  const session = await getOptionalSession();
  if (session) {
    const from = params?.from;
    const dest = from && from.startsWith('/') && !from.startsWith('//') ? from : '/dashboard';
    redirect(dest);
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
