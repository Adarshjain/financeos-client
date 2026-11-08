'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { Text } from '@/components/ds/Text/Text';
import { formatFileSize } from '@/features/transactions/import/fileLimits';
import { ActionError, unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';

import { loadEmailContent } from './gmailActions';
import { classifyEmailFailure, emailFrameHeight, emailMeta, emailSrcDoc } from './viewEmailModel';

/** The mail itself, read live from the user's Gmail (nothing is stored here or on the server). Mount it only while open. */
export function ViewEmailDialog({ ledgerId, subject, onClose }: { ledgerId: string; subject?: string | null; onClose: () => void }) {
  const query = useQuery({
    queryKey: keys.settings.gmailEmailContent(ledgerId),
    queryFn: () => unwrapAction(loadEmailContent(ledgerId)),
    retry: false,
    staleTime: 5 * 60_000,
    // The mail is dropped from memory when the dialog closes: reopening reads Gmail again.
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const email = query.data;
  const failure = query.isError ? classifyEmailFailure(query.error instanceof ActionError ? query.error.code : undefined) : null;

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="lg"
        title={email ? email.subject || '(no subject)' : subject || 'Email'}
        description={email ? emailMeta(email) : undefined}
        secondary={{ label: 'Close', onSelect: onClose }}
      >
        <Dialog.Body>
          {query.isLoading ? (
            <div data-testid="view-email-loading" className="flex flex-col gap-space-8">
              <Skeleton height={16} />
              <Skeleton height={16} />
              <Skeleton height={120} />
            </div>
          ) : null}
          {failure === 'gone' ? <Banner tone="warning">This email is no longer in your mailbox.</Banner> : null}
          {failure === 'reconnect' ? (
            <Banner tone="warning" action={{ label: 'Go to Connections', href: '/settings/connections' }}>
              Reconnect this mailbox to view the email.
            </Banner>
          ) : null}
          {failure === 'generic' ? (
            <Banner tone="danger" action={{ label: 'Retry', onSelect: () => void query.refetch() }}>
              {"Couldn't load this email."}
            </Banner>
          ) : null}
          {email ? (
            <div className="flex flex-col gap-space-12">
              {email.html ? (
                <iframe
                  title="Email"
                  data-testid="view-email-frame"
                  sandbox="allow-popups allow-popups-to-escape-sandbox"
                  referrerPolicy="no-referrer"
                  srcDoc={emailSrcDoc(email.html)}
                  style={{ height: emailFrameHeight(email.html) }}
                  className="w-full rounded-ds-md border border-line-soft"
                />
              ) : email.text ? (
                <Text as="pre" variant="body" data-testid="view-email-text" className="whitespace-pre-wrap break-words font-text">
                  {email.text}
                </Text>
              ) : email.tooLarge ? (
                <Text variant="body" tone="ink-3" as="p" data-testid="view-email-too-large">
                  This email is too large to show here. Open it in Gmail.
                </Text>
              ) : (
                <Text variant="body" tone="ink-3" as="p">
                  This email has no text to show.
                </Text>
              )}
              {email.attachments.length > 0 ? (
                <div className="flex flex-col gap-space-4" data-testid="view-email-attachments">
                  <Text variant="label" tone="ink-3">
                    Attachments
                  </Text>
                  {email.attachments.map((a, i) => (
                    <Text key={`${a.filename}-${i}`} variant="body" as="p" className="break-all">
                      {`${a.filename} · ${formatFileSize(a.size)}`}
                    </Text>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}
