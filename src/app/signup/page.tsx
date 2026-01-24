import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';

import { SignupForm } from './SignupForm';

export default async function SignupPage() {
  const session = await getSession();
  if (session) {
    redirect('/dashboard');
  }

  return <SignupForm />;
}
