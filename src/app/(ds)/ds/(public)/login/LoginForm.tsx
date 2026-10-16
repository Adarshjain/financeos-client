'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useActionState, useEffect, useState } from 'react';

import { login, startGoogleSSO } from '@/actions/auth';
import {
  Banner,
  Button,
  cn,
  Divider,
  Illustration,
  Logo,
  showToast,
  TextField,
} from '@/components/ds';
import type { ApiResult, UserResponse } from '@/lib/types';

export function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDeleted = searchParams.get('deleted') === '1';

  const [state, formAction, isPending] = useActionState(
    login,
    null as ApiResult<UserResponse> | null,
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const [ssoPending, setSsoPending] = useState(false);

  // Redirect on successful login
  useEffect(() => {
    if (state?.success) {
      const from = searchParams.get('from');
      const dest =
        from && from.startsWith('/') && !from.startsWith('//')
          ? from
          : '/dashboard';
      router.push(dest);
    }
  }, [state, router, searchParams]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!email.trim() || !password) {
      e.preventDefault();
      setClientError('Email and password are required.');
      return;
    }
    setClientError(null);
  };

  const handleGoogleSSO = async () => {
    if (ssoPending) return;
    setSsoPending(true);
    const result = await startGoogleSSO();
    if (result.success) {
      window.location.href = result.data.authorizationUrl;
    } else {
      showToast(result.error.message, { tone: 'danger' });
      setSsoPending(false);
    }
  };

  const errorMessage =
    clientError ?? (state && !state.success ? state.error.message : null);

  return (
    <div className="min-h-dvh flex flex-col lg:grid lg:grid-cols-2 bg-canvas">
      {/* Signin artwork illustration: phone band on top, full column on desktop */}
      <Illustration variant="signin" className="w-full h-auto lg:h-full rounded-none" />

      {/* Form column */}
      <div className="flex-1 flex items-center justify-center p-space-20 lg:p-space-40">
        <div className="w-full max-w-sm flex flex-col gap-space-16">
          {/* Logo, title, subtitle */}
          <div className="flex flex-col gap-space-4">
            <div className="mb-space-6">
              <Logo variant="mark" size="md" />
            </div>
            <h1 className="font-text font-extrabold text-heading text-ink m-0">
              Sign in
            </h1>
            <p className="font-text text-label text-ink-3 m-0">Welcome back.</p>
          </div>

          <form
            noValidate
            onSubmit={handleSubmit}
            action={formAction}
            className="flex flex-col gap-space-16"
          >
            {/* Deleted account notification */}
            {isDeleted && (
              <Banner tone="success">Your account has been deleted.</Banner>
            )}

            {/* Error banner */}
            {errorMessage && (
              <Banner tone="danger">{errorMessage}</Banner>
            )}

            {/* Continue with Google button */}
            <Button
              type="button"
              variant="google"
              loading={ssoPending}
              loadingLabel="Opening Google…"
              disabled={ssoPending || isPending}
              onClick={handleGoogleSSO}
            >
              Continue with Google
            </Button>

            <Divider label="or" className="my-space-2" />

            <div
              className={cn(
                'flex flex-col gap-space-12',
                ssoPending && 'opacity-55 pointer-events-none',
              )}
            >
              <TextField
                id="email"
                label="Email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (clientError) setClientError(null);
                }}
                disabled={isPending || ssoPending}
              />

              <TextField
                id="password"
                label="Password"
                name="password"
                kind="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (clientError) setClientError(null);
                }}
                disabled={isPending || ssoPending}
              />

              <Button
                type="submit"
                variant="primary"
                size="xl"
                className="w-full mt-space-4"
                loading={isPending}
                loadingLabel="Signing in…"
                disabled={isPending || ssoPending}
                onClick={(e) => {
                  if (!email.trim() || !password) {
                    e.preventDefault();
                    setClientError('Email and password are required.');
                  }
                }}
              >
                Sign in
              </Button>
            </div>
          </form>

          {/* Link to sign up */}
          <p className="text-center font-text text-label text-ink-3 m-0">
            Don&apos;t have an account?{' '}
            <Link
              href="/ds/signup"
              className="text-brand font-bold underline hover:no-underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
