'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useActionState, useEffect, useState } from 'react';

import { signup, startGoogleSSO } from '@/actions/auth';
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

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(
    signup,
    null as ApiResult<UserResponse> | null,
  );
  const router = useRouter();

  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const [ssoPending, setSsoPending] = useState(false);

  const isSuccess = Boolean(state?.success);

  useEffect(() => {
    if (isSuccess) {
      router.push('/dashboard');
    }
  }, [isSuccess, router]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!inviteCode.trim() || !email.trim() || !password) {
      e.preventDefault();
      setClientError('All fields are required.');
      return;
    }
    if (password.length < 8) {
      e.preventDefault();
      setClientError('Password must be at least 8 characters.');
      return;
    }
    setClientError(null);
  };

  const handleGoogleSSO = async () => {
    if (ssoPending || isPending || isSuccess) return;
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
      {/* Signup artwork illustration: phone band on top, full column on desktop */}
      <Illustration
        variant="signup"
        className="w-full h-auto lg:h-full rounded-none"
      />

      {/* Form column */}
      <div className="flex-1 flex items-center justify-center p-space-20 lg:p-space-40">
        <div className="w-full max-w-sm flex flex-col gap-space-16">
          {/* Logo, title, subtitle */}
          <div className="flex flex-col gap-space-4">
            <div className="mb-space-6">
              <Logo variant="mark" size="md" />
            </div>
            <h1 className="font-text font-extrabold text-heading text-ink m-0">
              Create account
            </h1>
            <p className="font-text text-label text-ink-3 m-0">
              Welcome to FinanceOS.
            </p>
          </div>

          <form
            noValidate
            onSubmit={handleSubmit}
            action={formAction}
            className="flex flex-col gap-space-16"
          >
            {/* Invite-only info banner */}
            <Banner tone="info">
              FinanceOS is invite-only — you&apos;ll need a code to sign up.
            </Banner>

            {/* Account created success banner */}
            {isSuccess && (
              <Banner tone="success">Account created! Redirecting…</Banner>
            )}

            {/* Error banner */}
            {errorMessage && !isSuccess && (
              <Banner tone="danger">{errorMessage}</Banner>
            )}

            {/* Sign up with Google button */}
            <Button
              type="button"
              variant="google"
              loading={ssoPending}
              loadingLabel="Opening Google…"
              disabled={ssoPending || isPending || isSuccess}
              onClick={handleGoogleSSO}
            >
              Sign up with Google
            </Button>

            <Divider label="or" className="my-space-2" />

            <div
              className={cn(
                'flex flex-col gap-space-12',
                (ssoPending || isSuccess) && 'opacity-55 pointer-events-none',
              )}
            >
              <TextField
                id="inviteCode"
                label="Invite code"
                name="inviteCode"
                kind="password"
                placeholder="Provided by the FinanceOS admin"
                autoCapitalize="characters"
                autoComplete="off"
                required
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  if (clientError) setClientError(null);
                }}
                disabled={isPending || ssoPending || isSuccess}
              />

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
                disabled={isPending || ssoPending || isSuccess}
              />

              <TextField
                id="password"
                label="Password"
                name="password"
                kind="password"
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (clientError) setClientError(null);
                }}
                disabled={isPending || ssoPending || isSuccess}
              />

              <p className="text-caption text-ink-3 m-0 leading-normal">
                By continuing you agree to the terms. Your data stays in your
                account; delete it any time from Settings.
              </p>

              <Button
                type="submit"
                variant="primary"
                size="xl"
                className="w-full mt-space-4"
                loading={isPending}
                loadingLabel="Creating account…"
                disabled={isPending || ssoPending || isSuccess}
                onClick={(e) => {
                  if (!inviteCode.trim() || !email.trim() || !password) {
                    e.preventDefault();
                    setClientError('All fields are required.');
                    return;
                  }
                  if (password.length < 8) {
                    e.preventDefault();
                    setClientError('Password must be at least 8 characters.');
                  }
                }}
              >
                Create account
              </Button>
            </div>
          </form>

          {/* Under form navigation link */}
          <p className="text-caption text-ink-3 text-center m-0">
            Already have an account?{' '}
            <Link
              href="/ds/login"
              className="text-brand font-bold underline hover:no-underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
