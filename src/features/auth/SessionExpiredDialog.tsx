'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React, { useActionState, useEffect, useState } from 'react';

import { login, logoutToDinero } from '@/actions/auth';
import { Banner } from '@/components/ds/Banner/Banner';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { TextField } from '@/components/ds/TextField/TextField';
import { AUTH_EXPIRED_EVENT, claimAuthExpired } from '@/lib/authExpiry';
import type { ApiResult, UserResponse } from '@/lib/types';

const FORM_ID = 'session-expired-form';

/**
 * The session ended while the page was open (any API call came back 401): ask for the password over the page
 * instead of navigating away. Opens from state; any number of 401s open one dialog. Signing in refreshes the
 * server data and refetches every query, so the page carries on where it was. Uses the same `login` action as
 * the login page.
 */
export function SessionExpiredDialog({ email }: { email?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [state, formAction, isPending] = useActionState(
    async (_prev: ApiResult<UserResponse> | null, formData: FormData) => {
      const result = await login(null, formData);
      if (result.success) {
        setOpen(false);
        setPassword('');
        router.refresh();
        void queryClient.invalidateQueries();
      }
      return result;
    },
    null as ApiResult<UserResponse> | null
  );
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const release = claimAuthExpired();
    const onExpired = () => setOpen(true);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
      release();
    };
  }, []);

  const [typedEmail, setTypedEmail] = useState('');
  const error = state && !state.success ? state.error.message : null;
  const busy = isPending || signingOut;

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <Dialog.Content
        size="sm"
        title="Sign in again"
        description="Your session ended. Sign in to carry on where you were."
        showClose={false}
        dismissible={false}
        secondary={{
          label: 'Sign out',
          disabled: busy,
          onSelect: () => {
            setSigningOut(true);
            void logoutToDinero();
          },
        }}
        primary={{ label: 'Sign in', type: 'submit', form: FORM_ID, loading: isPending, disabled: busy }}
      >
        <Dialog.Body>
          <form id={FORM_ID} noValidate action={formAction} className="flex flex-col gap-space-8 desk:gap-space-12">
            {error && <Banner tone="danger">{error}</Banner>}
            <TextField
              id="session-expired-email"
              label="Email"
              name="email"
              type="email"
              autoComplete="username"
              {...(email
                ? { value: email, readOnly: true }
                : { value: typedEmail, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setTypedEmail(e.target.value) })}
            />
            <TextField
              id="session-expired-password"
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
