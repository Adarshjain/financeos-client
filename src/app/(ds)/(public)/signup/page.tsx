import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import React, { Suspense } from 'react';

import { appHref } from '@/features/shell/routes';
import { getOptionalSession } from '@/lib/auth';

import { SignupForm } from './SignupForm';

export const metadata: Metadata = { title: 'Create account' };

export default async function DsSignupPage() {
  const session = await getOptionalSession();
  if (session) {
    redirect(appHref('/dashboard'));
  }

  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
