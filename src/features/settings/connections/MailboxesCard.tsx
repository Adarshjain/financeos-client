'use client';

import React, { useState } from 'react';

import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  StatusWord,
  Text,
} from '@/components/ds';

import { authFailedLine, type GmailConnection, mailboxStatusLine } from './connectionsModel';

interface MailboxesCardProps {
  connections: GmailConnection[];
  /** 'connect' | 'sync' | 'connections' while something is in flight, else null. */
  loading: string | null;
  isSyncing: boolean;
  onConnect: () => void;
  onSync: () => void;
  /** Runs the disconnect after the dialog is confirmed. */
  onDisconnect: (id: string) => Promise<boolean | void> | boolean | void;
}

function MailboxRow({
  conn,
  showPrimary,
  busy,
  onReconnect,
  onDisconnect,
}: {
  conn: GmailConnection;
  showPrimary: boolean;
  busy: boolean;
  onReconnect: () => void;
  onDisconnect: () => void;
}) {
  const failed = authFailedLine(conn);
  return (
    <Card.Row
      data-testid="mailbox-row"
      className="flex-col items-stretch desk:flex-row desk:items-center desk:justify-between"
    >
      <div className="flex items-start gap-space-12 min-w-0">
        <Avatar variant="circle" tone="brand" initials={conn.email.charAt(0).toUpperCase()} />
        <div className="flex flex-col min-w-0">
          <Text variant="body-strong" truncate>
            {conn.email}
          </Text>
          <Text variant="caption" tone="ink-3">
            {mailboxStatusLine(conn)}
          </Text>
          {failed ? (
            <Text variant="caption" tone="danger" as="p">
              {failed}
            </Text>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-space-8 shrink-0">
        {showPrimary && conn.isPrimary ? <Badge tone="neutral">Primary</Badge> : null}
        {conn.needsReconnect ? (
          <StatusWord tone="warning" data-testid={`needs-reconnect-${conn.id}`}>
            Needs reconnect
          </StatusWord>
        ) : (
          <StatusWord tone="success">Healthy</StatusWord>
        )}
        {conn.needsReconnect ? (
          <Button variant="secondary" size="sm" disabled={busy} onClick={onReconnect}>
            Reconnect
          </Button>
        ) : null}
        <Button variant="secondary" size="sm" onClick={onDisconnect}>
          Disconnect
        </Button>
      </div>
    </Card.Row>
  );
}

/** The connected Gmail mailboxes: health, reconnect, disconnect (with a confirm), Sync now and Add mailbox. */
export function MailboxesCard({ connections, loading, isSyncing, onConnect, onSync, onDisconnect }: MailboxesCardProps) {
  const [disconnecting, setDisconnecting] = useState<GmailConnection | null>(null);
  const [removing, setRemoving] = useState(false);
  const anyNeedsReconnect = connections.some((c) => c.needsReconnect);

  const confirmDisconnect = async () => {
    if (!disconnecting) return;
    setRemoving(true);
    try {
      const ok = await onDisconnect(disconnecting.id);
      if (ok !== false) setDisconnecting(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <Card>
        <Card.Header className="max-desk:flex-col max-desk:items-start">
          <div className="min-w-0">
            <Card.Title>Mailboxes</Card.Title>
            <Card.Subtitle>Read-only access to bank alert emails</Card.Subtitle>
          </div>
          <div className="shrink-0 flex items-center gap-space-12">
            {connections.length > 0 ? (
              <Text variant="label" as="span">
                <Button
                  variant="link"
                  size="sm"
                  loading={loading === 'sync' || isSyncing}
                  loadingLabel="Syncing…"
                  disabled={loading !== null || isSyncing}
                  onClick={onSync}
                >
                  Sync now
                </Button>
              </Text>
            ) : null}
            <Text variant="label" as="span">
              <Button variant="link" size="sm" loading={loading === 'connect'} disabled={loading !== null} onClick={onConnect}>
                Add mailbox
              </Button>
            </Text>
          </div>
        </Card.Header>

        {connections.length === 0 ? (
          <EmptyState
            size="sm"
            title="No Gmail accounts yet"
            description="Connect a mailbox to import bank alerts and statements automatically."
            action={{ label: 'Connect your first account', onSelect: onConnect, variant: 'primary' }}
          />
        ) : (
          <>
            {connections.map((conn) => (
              <MailboxRow
                key={conn.id}
                conn={conn}
                showPrimary={connections.length > 1}
                busy={loading !== null}
                onReconnect={onConnect}
                onDisconnect={() => setDisconnecting(conn)}
              />
            ))}
            {!anyNeedsReconnect ? (
              <div className="px-space-16 pb-space-16 pt-space-4">
                <Banner tone="neutral" data-testid="expiry-note">
                  Google expires tokens after 7 days of inactivity on test apps. If a mailbox shows{' '}
                  <strong>Reconnect</strong>, nothing is lost: sync resumes where it stopped.
                </Banner>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={disconnecting !== null}
        onOpenChange={(open) => {
          if (!open && !removing) setDisconnecting(null);
        }}
        title={disconnecting ? `Disconnect ${disconnecting.email}?` : 'Disconnect mailbox?'}
        description="Are you sure you want to disconnect this Gmail account? All syncing for this email will stop."
        confirmLabel="Disconnect"
        confirmLoading={removing}
        onConfirm={confirmDisconnect}
      />
    </>
  );
}
