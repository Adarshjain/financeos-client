'use client';

import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { signup } from '@/actions/auth';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SubmitButton } from '@/components/forms/submit-button';
import { AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import type { ApiResult, UserResponse } from '@/lib/types';

export function SignupForm() {
  const [state, formAction] = useFormState(signup, null as ApiResult<UserResponse> | null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push('/login');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 shadow-lg">
            <DollarSign className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Account</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign up to get started with FinanceOS</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form action={formAction} className="space-y-4">
              {state && !state.success && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.error.message}</AlertDescription>
                </Alert>
              )}

              {state?.success && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>Account created! Redirecting to login...</AlertDescription>
                </Alert>
              )}
              
              <FormField
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={state?.success}
              />
              
              <FormField
                label="Password"
                name="password"
                type="password"
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                required
                disabled={state?.success}
              />
              
              <SubmitButton className="w-full" disabled={state?.success}>
                Create Account
              </SubmitButton>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

