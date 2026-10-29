'use client';

import React from 'react';

import {
  Banner,
  Button,
  Card,
  CardHeader,
  CardSubtitle,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  Text,
  TextField,
} from '@/components/ds';
import type { UserResponse } from '@/lib/types';

import { useDeleteAccountFlow } from './useDeleteAccountFlow';
import { formatDeletionSummary } from './useDeletionSummary';

const WHAT_GOES = [
  'All accounts, transactions, investments, categories, and rules will be erased.',
  'Google OAuth permissions and Gmail connections will be revoked.',
  'Stored LLM API keys and task configurations will be destroyed.',
  'Point-in-time encrypted database backups will age out on standard retention.',
  'You will be immediately signed out across all active devices.',
];

const FORM_ID = 'delete-account-form';

/** The delete-account card and its confirm dialog (summary, what goes, password or email, DELETE phrase). */
export function DeleteAccountCard({ user }: { user: UserResponse }) {
  const f = useDeleteAccountFlow(user, { toDinero: true });

  return (
    <>
      <Card tone="danger">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Delete account</CardTitle>
            <CardSubtitle truncate={false}>
              Removes every account, transaction, statement, rule and connection. This can&apos;t be undone.
            </CardSubtitle>
          </div>
        </CardHeader>
        <div className="px-space-16 pb-space-16">
          <Button variant="danger" onClick={f.handleOpen}>
            Delete account
          </Button>
        </div>
      </Card>

      <Dialog open={f.open} onOpenChange={f.handleOpenChange}>
        <DialogContent
          size="md"
          dismissible={!f.isDeleting}
          title="Delete account?"
          description="Everything below is erased and you are signed out everywhere. This can't be undone."
          secondary={{ label: 'Cancel', disabled: f.isDeleting, onSelect: f.close }}
          primary={{
            label: f.isDeleting ? 'Deleting account…' : f.isBusy ? 'Retry deletion' : 'Delete account',
            destructive: true,
            type: 'submit',
            form: FORM_ID,
            disabled: !f.canSubmit,
          }}
        >
          <DialogBody>
            <div className="flex flex-col gap-space-8 desk:gap-space-16">
              {f.loadingSummary ? (
                <Banner tone="neutral">Calculating data to be deleted…</Banner>
              ) : f.summary ? (
                <Banner tone="danger" title="Records to be deleted:">
                  {formatDeletionSummary(f.summary)}
                </Banner>
              ) : null}

              <ul className="list-disc pl-space-16 flex flex-col gap-space-6">
                {WHAT_GOES.map((line) => (
                  <Text key={line} as="li" variant="body">
                    {line}
                  </Text>
                ))}
              </ul>

              {f.error ? <Banner tone={f.isBusy ? 'warning' : 'danger'}>{f.error}</Banner> : null}

              <form
                id={FORM_ID}
                noValidate
                autoComplete="off"
                className="flex flex-col gap-space-8 desk:gap-space-12"
                onSubmit={(e) => {
                  e.preventDefault();
                  void f.handleDelete();
                }}
              >
                {f.hasPassword ? (
                  <TextField
                    label="Current password"
                    name="delete-account-password"
                    type="password"
                    value={f.password}
                    onChange={(e) => f.setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    autoComplete="current-password"
                    disabled={f.isDeleting}
                  />
                ) : (
                  <TextField
                    label="Confirm email address"
                    name="delete-account-email"
                    type="email"
                    value={f.confirmEmail}
                    onChange={(e) => f.setConfirmEmail(e.target.value)}
                    placeholder={`Type "${user.email}" to confirm`}
                    helper="Enter your account email exactly to verify identity"
                    disabled={f.isDeleting}
                  />
                )}
                <TextField
                  label='Type "DELETE" to confirm'
                  name="delete-account-phrase"
                  type="text"
                  value={f.confirmPhrase}
                  onChange={(e) => f.setConfirmPhrase(e.target.value)}
                  placeholder="DELETE"
                  disabled={f.isDeleting}
                />
              </form>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
