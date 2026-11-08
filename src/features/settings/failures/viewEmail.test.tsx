import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serverApi as api } from '@/lib/api/server';
import { renderWithQuery } from '@/test/renderWithQuery';

import { EmailDetailsDialog } from './FailureDetailsDialog';
import type { FailedEmail } from './failuresModel';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } }));

const item = {
  ledgerId: 'ledger-1',
  gmailMessageId: 'g-1',
  userId: 'user-1',
  userEmail: 'owner@example.test',
  connectionEmail: 'owner@gmail.test',
  sender: 'alerts@bank.test',
  subject: 'Statement',
  internalDate: '2026-10-13T10:00:00Z',
  status: 'FAILED_PERMANENT',
  attemptCount: 5,
} as FailedEmail;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.GET).mockResolvedValue({ data: item } as never);
});

describe('Failures: View email', () => {
  it('shows View email next to Open in Gmail for the admin’s own mailbox', async () => {
    renderWithQuery(<EmailDetailsDialog item={item} currentUserId="user-1" onClose={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'View email' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in Gmail' })).toBeInTheDocument();
  });

  it('never shows it for another user’s mail, or when the viewer is unknown', async () => {
    const { unmount } = renderWithQuery(<EmailDetailsDialog item={item} currentUserId="someone-else" onClose={vi.fn()} />);
    expect(await screen.findByRole('link', { name: 'Open in Gmail' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View email' })).toBeNull();
    unmount();
    renderWithQuery(<EmailDetailsDialog item={item} onClose={vi.fn()} />);
    expect(await screen.findByRole('link', { name: 'Open in Gmail' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View email' })).toBeNull();
  });
});
