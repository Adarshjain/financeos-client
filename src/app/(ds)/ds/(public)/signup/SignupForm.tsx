'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useActionState, useEffect, useState } from 'react';

import { signup, startGoogleSSO } from '@/actions/auth';
import {
  Banner,
  Button,
  Divider,
  showToast,
  Text,
  TextField,
} from '@/components/ds';
import { Illustration } from '@/components/organisms';
import { appHref } from '@/features/shell/routes';
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
      router.push(appHref('/dashboard'));
    }
  }, [isSuccess, router]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!email.trim() || !password || !inviteCode.trim()) {
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
    <div className="min-h-dvh flex flex-col desk:grid desk:grid-cols-2">
      {/* Signup artwork illustration: phone band on top, full column on desktop */}
      <Illustration variant="signup" className="w-full h-auto desk:h-full" />

      {/* Form column */}
      <div className="flex-1 flex items-center justify-center p-space-20 desk:p-space-40">
        <div className="w-full max-w-sm flex flex-col gap-space-16">
          {/* 1. Title and 2. Subtitle */}
          <div className="flex flex-col gap-space-4">
            <Text as="h1" variant="page-title" family="display">
              Create account
            </Text>
            <Text variant="body" tone="ink-3">
              FinanceOS is invite-only — you&apos;ll need a code to sign up.
            </Text>
          </div>

          <form
            noValidate
            onSubmit={handleSubmit}
            action={formAction}
            className="flex flex-col gap-space-16"
          >
            {/* Account created success banner */}
            {isSuccess && (
              <Banner tone="success">Account created! Redirecting…</Banner>
            )}

            {/* Error banner */}
            {errorMessage && !isSuccess && (
              <Banner tone="danger">{errorMessage}</Banner>
            )}

            {/* 3. Continue with Google */}
            <Button
              type="button"
              variant="secondary"
              size="xl"
              fullWidth
              icon={
                <img
                  src="/brand/google-g.svg"
                  alt=""
                  aria-hidden="true"
                  className="size-icon-md shrink-0"
                />
              }
              loading={ssoPending}
              loadingLabel="Opening Google…"
              disabled={ssoPending || isPending || isSuccess}
              onClick={handleGoogleSSO}
            >
              Sign up with Google
            </Button>

            {/* 4. Divider "or" */}
            <Divider label="or" />

            <div className="flex flex-col gap-space-12">
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
                type="password"
                placeholder="Minimum 8 characters"
                helper="At least 8 characters."
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (clientError) setClientError(null);
                }}
                disabled={isPending || ssoPending || isSuccess}
              />

              <TextField
                id="inviteCode"
                label="Invite code"
                name="inviteCode"
                type="password"
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
            </div>

            <div className="flex flex-col gap-space-12">
              <Button
                type="submit"
                variant="primary"
                size="xl"
                className="w-full"
                loading={isPending}
                loadingLabel="Creating account…"
                disabled={isPending || ssoPending || isSuccess}
              >
                Create account
              </Button>

              <Text variant="caption" tone="ink-3">
                By continuing you agree to the terms. Your data stays in your
                account; delete it any time from Settings.
              </Text>
            </div>
          </form>

          {/* 10. Footer line */}
          <Text variant="label" tone="ink-3" align="center">
            Already have an account?{' '}
            <Button variant="link" asChild>
              <Link href="/ds/login">Sign in</Link>
            </Button>
          </Text>
        </div>
      </div>
    </div>
  );
}
