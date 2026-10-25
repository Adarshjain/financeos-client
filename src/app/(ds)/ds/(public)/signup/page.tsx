import { redirect } from 'next/navigation';
import React from 'react';

import { appHref } from '@/features/shell/routes';
import { getOptionalSession } from '@/lib/auth';

import { SignupForm } from './SignupForm';

export default async function DsSignupPage() {
  const session = await getOptionalSession();
  if (session) {
    redirect(appHref('/dashboard'));
  }

  return <SignupForm />;
}
