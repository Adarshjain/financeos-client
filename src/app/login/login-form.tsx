'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { login } from '@/actions/auth';
import { Card, CardContent } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SubmitButton } from '@/components/forms/submit-button';
import { AlertCircle, DollarSign } from 'lucide-react';
import type { ApiResult, UserResponse } from '@/lib/types';

export function LoginForm() {
  const [state, formAction] = useFormState(login, null as ApiResult<UserResponse> | null);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo and Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 shadow-lg">
            <DollarSign className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome to FinanceOS</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in to your account to continue</p>
          </div>
        </div>

        {/* Login Form */}
        <Card>
          <CardContent className="pt-6">
            <form action={formAction} className="space-y-4">
              {state && !state.success && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.error.message}</AlertDescription>
                </Alert>
              )}
              
              <FormField
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              
              <FormField
                label="Password"
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              
              <SubmitButton className="w-full">
                Sign in
              </SubmitButton>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
