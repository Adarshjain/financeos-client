import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { GmailConnection } from './connectionsModel';
import { MailboxesCard } from './MailboxesCard';

const healthy = {
  id: 'c1',
  email: 'arjun.mehta@gmail.test',
  isPrimary: true,
  needsReconnect: false,
  connectedAt: '2026-06-15T10:00:00Z',
  lastSyncedAt: new Date().toISOString(),
} as GmailConnection;
const stale = {
  id: 'c2',
  email: 'second@gmail.test',
  isPrimary: false,
  needsReconnect: true,
  authFailedAt: '2026-10-13T08:00:00Z',
} as GmailConnection;

function setup(connections: GmailConnection[], over: Partial<React.ComponentProps<typeof MailboxesCard>> = {}) {
  const props = {
    connections,
    loading: null,
    isSyncing: false,
    onConnect: vi.fn(),
    onSync: vi.fn(),
    onDisconnect: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
  render(<MailboxesCard {...props} />);
  return props;
}

describe('MailboxesCard', () => {
  it('shows a healthy mailbox with its status line and the expiry note, and no Primary badge for one mailbox', () => {
    setup([healthy]);
    expect(screen.getByText('arjun.mehta@gmail.test')).toBeInTheDocument();
    expect(screen.getByText(/^Connected 15 Jun · last sync/)).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.queryByText('Primary')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reconnect' })).toBeNull();
    expect(screen.getByTestId('expiry-note')).toHaveTextContent('7 days of inactivity');
  });

  it('shows Primary only when there is more than one mailbox', () => {
    setup([healthy, { ...stale, needsReconnect: false }]);
    expect(screen.getAllByText('Primary')).toHaveLength(1);
  });

  it('shows Needs reconnect with the danger line and a Reconnect button that starts OAuth', () => {
    const p = setup([healthy, stale]);
    expect(screen.getByTestId('needs-reconnect-c2')).toHaveTextContent('Needs reconnect');
    expect(
      screen.getByText('Google stopped accepting this mailbox on 13 Oct 2026. Imports are paused until you reconnect.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }));
    expect(p.onConnect).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('expiry-note')).toBeNull();
  });

  it('offers Sync now only with a connected mailbox, and it syncs', () => {
    const p = setup([healthy]);
    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    expect(p.onSync).toHaveBeenCalledTimes(1);
  });

  it('disables Sync now while a sync job is active', () => {
    setup([healthy], { isSyncing: true });
    expect(screen.getByRole('button', { name: /Syncing/ })).toBeDisabled();
  });

  it('Add mailbox starts OAuth', () => {
    const p = setup([healthy]);
    fireEvent.click(screen.getByRole('button', { name: 'Add mailbox' }));
    expect(p.onConnect).toHaveBeenCalledTimes(1);
  });

  it('confirms before disconnecting, then disconnects', async () => {
    const p = setup([healthy]);
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(p.onDisconnect).not.toHaveBeenCalled();
    expect(screen.getByText(/All syncing for this email will stop/)).toBeInTheDocument();
    const confirm = screen.getAllByRole('button', { name: 'Disconnect' }).at(-1)!;
    fireEvent.click(confirm);
    await waitFor(() => expect(p.onDisconnect).toHaveBeenCalledWith('c1'));
    await waitFor(() => expect(screen.queryByText(/All syncing for this email will stop/)).toBeNull());
  });

  it('cancelling the disconnect dialog keeps the mailbox', () => {
    const p = setup([healthy]);
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(p.onDisconnect).not.toHaveBeenCalled();
  });

  it('shows the empty state with a first-account action and no Sync now', () => {
    const p = setup([]);
    expect(screen.getByText('No connected Gmail accounts found.')).toBeInTheDocument();
    expect(screen.getByText('Connect a mailbox to import bank alerts and statements automatically.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sync now' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Connect your first account' }));
    expect(p.onConnect).toHaveBeenCalledTimes(1);
  });
});
