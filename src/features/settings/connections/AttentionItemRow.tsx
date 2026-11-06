'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ListField } from '@/components/ds/ListField/ListField';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { loadAccountForm } from '@/features/accounts/form/ds/AccountDialogs';
import type { AccountFormDialogProps } from '@/features/accounts/form/ds/AccountFormDialog';
import { formatDate, formatDateTime } from '@/lib/format';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import { useAccount } from '@/lib/query/hooks/useAccounts';

import { attentionEditAccountId, attentionHintLink, type AttentionItem, describeAttentionItem, gmailMessageUrl } from './attentionItemModel';

interface AttentionItemRowProps {
  item: AttentionItem;
  retryItem: (ledgerId: string) => void;
  onAssign: (item: AttentionItem) => void;
  onArchive: (ledgerId: string) => void;
  onUnarchive: (ledgerId: string) => void;
}

function Details({ item, archived }: { item: AttentionItem; archived: boolean }) {
  return (
    <Card variant="inset" data-testid="attention-details">
      <ListField label="Mailbox" value={item.connectionEmail} />
      <ListField label="From" value={item.senderAddress || '—'} />
      <ListField label="Email date" value={formatDateTime(item.internalDate) || '—'} />
      {item.extractedLast4 ? <ListField label="Card" value={`••${item.extractedLast4}`} /> : null}
      {item.accountName ? <ListField label="Account" value={item.accountName} /> : null}
      <ListField label="First seen" value={formatDateTime(item.discoveredAt) || '—'} />
      <ListField label="Last tried" value={formatDateTime(item.processedAt) || '—'} />
      {item.attemptCount > 0 ? <ListField label="Attempts" value={item.attemptCount} /> : null}
      {archived ? <ListField label="Archived" value={formatDateTime(item.archivedAt) || '—'} /> : null}
      <ListField
        label="Error"
        value={
          <Text variant="body" mono>
            {item.error || '—'}
          </Text>
        }
      />
      <ListField
        label="Email"
        value={
          <Button asChild variant="link">
            <a href={gmailMessageUrl(item)} target="_blank" rel="noopener noreferrer">
              Open in Gmail
            </a>
          </Button>
        }
      />
    </Card>
  );
}

type FormDialog = React.ComponentType<AccountFormDialogProps>;

/** The hint as a button: on press loads the form's code and the account together (nothing before), then opens its Edit dialog in place on the password; falls back to the account page. */
function EditAccountHint({ accountId, label, href }: { accountId: string; label: string; href: string }) {
  const [pressed, setPressed] = useState(false);
  const [ready, setReady] = useState(false);
  const { Component: AccountFormDialog, run, preload } = useLazyDialog(loadAccountForm);
  const close = () => {
    setPressed(false);
    setReady(false);
  };
  const open = () => {
    setPressed(true);
    void run(() => {}).then((loaded) => {
      if (!loaded) close();
    });
  };
  return (
    <>
      <Text variant="label" as="span">
        <Button variant="link" loading={pressed && !ready} onPointerDown={preload} onClick={open}>
          {label}
        </Button>
      </Text>
      {pressed ? <EditAccountLoader accountId={accountId} href={href} Dialog={AccountFormDialog} onReady={() => setReady(true)} onClose={close} /> : null}
    </>
  );
}

function EditAccountLoader({ accountId, href, Dialog, onReady, onClose }: { accountId: string; href: string; Dialog: FormDialog | null; onReady: () => void; onClose: () => void }) {
  const router = useRouter();
  const { data: account, isError, isSuccess } = useAccount(accountId);
  const failed = isError || (isSuccess && !account);
  const shown = Boolean(account && Dialog);
  React.useEffect(() => {
    if (shown) onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);
  React.useEffect(() => {
    if (!failed) return;
    onClose();
    router.push(href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);
  if (!account || !Dialog) return null;
  return <Dialog account={account} focusField="statementPassword" onClose={onClose} />;
}

/** One Gmail item that could not become a transaction: what happened, the next step, details and actions. */
export function AttentionItemRow({ item, retryItem, onAssign, onArchive, onUnarchive }: AttentionItemRowProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { label, summary, hint } = describeAttentionItem(item);
  const hintLink = attentionHintLink(item);
  const editAccountId = attentionEditAccountId(item);
  const archived = Boolean(item.archivedAt);
  const emailDate = item.internalDate ?? item.discoveredAt;

  return (
    <Card.Row
      data-testid="attention-item"
      className="flex-col items-stretch desk:flex-row desk:items-start desk:justify-between"
    >
      <div className="flex flex-col gap-space-4 min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-space-8 gap-y-space-4">
          <StatusWord tone="warning">{label}</StatusWord>
          <Text variant="caption" tone="ink-3" className="break-all">
            {formatDate(emailDate, 'list')}
            {item.senderAddress ? ` · ${item.senderAddress}` : ''}
          </Text>
        </div>
        <Text variant="body-strong" as="p" className="break-words">
          {item.subject || '(no subject)'}
        </Text>
        <Text variant="body" tone="ink-2" as="p">
          {summary}
        </Text>
        {hintLink && editAccountId ? (
          <EditAccountHint accountId={editAccountId} label={hintLink.label} href={hintLink.href} />
        ) : hintLink ? (
          <Text variant="label" as="span">
            <Button asChild variant="link">
              <Link href={hintLink.href}>{hintLink.label}</Link>
            </Button>
          </Text>
        ) : (
          <Text variant="caption" tone="ink-3" as="p">
            {hint}
          </Text>
        )}
        <div>
          <Text variant="label" as="span">
            <Button variant="link" size="sm" aria-expanded={showDetails} onClick={() => setShowDetails((v) => !v)}>
              {showDetails ? 'Hide details' : 'Details'}
            </Button>
          </Text>
        </div>
        {showDetails ? <Details item={item} archived={archived} /> : null}
      </div>

      <div className="flex flex-wrap items-center gap-space-8 desk:shrink-0 desk:justify-end">
        {archived ? (
          <Button variant="secondary" size="sm" onClick={() => onUnarchive(item.id)}>
            Unarchive
          </Button>
        ) : (
          <>
            {item.status === 'UNRESOLVED_ACCOUNT' && item.extractedLast4 ? (
              <Button variant="secondary" size="sm" onClick={() => onAssign(item)}>
                Assign
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={() => retryItem(item.id)}>
              Retry
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onArchive(item.id)}>
              Archive
            </Button>
          </>
        )}
      </div>
    </Card.Row>
  );
}
