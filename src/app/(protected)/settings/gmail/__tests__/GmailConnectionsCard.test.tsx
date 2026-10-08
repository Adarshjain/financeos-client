import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GmailConnectionsCard } from '@/app/(protected)/settings/gmail/GmailConnectionsCard';
import type { Schemas } from '@/lib/api/types';

type Connection = Schemas['GmailConnectionResponse'];

function connection(overrides: Partial<Connection> = {}): Connection {
  return {
    id: 'conn-1',
    email: 'ajay@example.test',
    isConnected: true,
    isPrimary: true,
    connectedAt: '2026-09-02T15:00:00Z',
    lastSyncedAt: '2026-09-09T10:00:00Z',
    authFailedAt: null,
    needsReconnect: false,
    ...overrides,
  } as Connection;
}

function renderCard(connections: Connection[], onConnect = vi.fn()) {
  render(
    <GmailConnectionsCard
      connections={connections}
      loading={null}
      isSyncing={false}
      onConnect={onConnect}
      onDisconnect={vi.fn()}
      onSync={vi.fn()}
    />,
  );
  return onConnect;
}

describe('GmailConnectionsCard', () => {
  it('shows a healthy mailbox without any reconnect affordance', () => {
    renderCard([connection()]);
    expect(screen.getByText('ajay@example.test')).toBeInTheDocument();
    expect(screen.queryByText('Needs reconnect')).toBeNull();
    expect(screen.queryByRole('button', { name: /reconnect/i })).toBeNull();
  });

  it('flags a mailbox whose token Google rejected and offers to reconnect it', () => {
    const onConnect = renderCard([
      connection({ needsReconnect: true, authFailedAt: '2026-09-16T10:45:00Z' }),
    ]);
    expect(screen.getByTestId('needs-reconnect-conn-1')).toHaveTextContent('Needs reconnect');
    expect(screen.getByText(/Google stopped accepting this mailbox on/)).toHaveTextContent('Imports are paused until you reconnect.');

    fireEvent.click(screen.getByRole('button', { name: 'Reconnect ajay@example.test' }));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it('keeps the disconnect action next to the reconnect one', () => {
    renderCard([connection({ needsReconnect: true, authFailedAt: '2026-09-16T10:45:00Z' })]);
    const row = screen.getByText('ajay@example.test').closest('div[class*="justify-between"]') as HTMLElement;
    expect(within(row).getByRole('button', { name: 'Disconnect ajay@example.test' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Reconnect ajay@example.test' })).toBeInTheDocument();
  });

  it('only the dead mailbox gets the badge when several are listed', () => {
    renderCard([
      connection(),
      connection({ id: 'conn-2', email: 'other@example.test', isPrimary: false, needsReconnect: true, authFailedAt: '2026-09-16T10:45:00Z' }),
    ]);
    expect(screen.queryByTestId('needs-reconnect-conn-1')).toBeNull();
    expect(screen.getByTestId('needs-reconnect-conn-2')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Reconnect/ })).toHaveLength(1);
  });
});
