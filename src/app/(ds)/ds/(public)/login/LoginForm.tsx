'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useActionState, useState } from 'react';

import { login, startGoogleSSO } from '@/actions/auth';
import {
  Banner,
  Button,
  Divider,
  showToast,
  Text,
  TextField,
} from '@/components/ds';
import { Illustration } from '@/components/organisms';
import type { ApiResult, UserResponse } from '@/lib/types';

export function LoginForm() {
  const searchParams = useSearchParams();
  const isDeleted = searchParams.get('deleted') === '1';

  const [state, formAction, isPending] = useActionState(
    login,
    null as ApiResult<UserResponse> | null,
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const [ssoPending, setSsoPending] = useState(false);

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
    <div className="min-h-dvh flex flex-col lg:grid lg:grid-cols-2">
      {/* Signin artwork illustration: phone band on top, full column on desktop */}
      <Illustration variant="signin" className="w-full h-auto lg:h-full" />

      {/* Form column */}
      <div className="flex-1 flex items-center justify-center p-space-20 lg:p-space-40">
        <div className="w-full max-w-sm flex flex-col gap-space-16">
          {/* 1. Title and 2. Subtitle */}
          <div className="flex flex-col gap-space-4">
            <Text as="h1" variant="page-title" family="display">
              Sign in
            </Text>
            <Text variant="body" tone="ink-3">
              Welcome back.
            </Text>
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
              disabled={ssoPending || isPending}
              onClick={handleGoogleSSO}
            >
              Continue with Google
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
                disabled={isPending || ssoPending}
              />

              <TextField
                id="password"
                label="Password"
                name="password"
                type="password"
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
            </div>

            <Button
              type="submit"
              variant="primary"
              size="xl"
              className="w-full"
              loading={isPending}
              loadingLabel="Signing in…"
              disabled={isPending || ssoPending}
            >
              Sign in
            </Button>
          </form>

          {/* 8. Footer line */}
          <Text variant="label" tone="ink-3" align="center">
            Don&apos;t have an account?{' '}
            <Button variant="link" asChild>
              <Link href="/ds/signup">Sign up</Link>
            </Button>
          </Text>
        </div>
      </div>
    </div>
  );
}
