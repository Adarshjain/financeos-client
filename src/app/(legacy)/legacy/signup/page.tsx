import { redirect } from 'next/navigation';

import { legacyHref } from '@/features/shell/routes';
import { getOptionalSession } from '@/lib/auth';

import { SignupForm } from './SignupForm';

export default async function SignupPage() {
  const session = await getOptionalSession();
  if (session) {
    redirect(legacyHref('/dashboard'));
  }

  return <SignupForm />;
}
