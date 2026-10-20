import { redirect } from 'next/navigation';

import { getOptionalSession } from '@/lib/auth';

import { SignupForm } from './SignupForm';

export default async function SignupPage() {
  const session = await getOptionalSession();
  if (session) {
    redirect('/dashboard');
  }

  return <SignupForm />;
}
