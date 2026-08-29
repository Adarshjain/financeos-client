import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getOptionalSession } from '@/lib/auth';

import { LoginForm } from './LoginForm';

export default async function LoginPage() {
  // If user already has valid session, redirect to dashboard
  const session = await getOptionalSession();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
