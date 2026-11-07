import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { serverApi as api } from '@/lib/api/server';
import { pinClock } from '@/test/pinClock';
import { renderWithQuery } from '@/test/renderWithQuery';

import { Details } from './AttentionItemRow';
import { ViewEmailDialog } from './ViewEmailDialog';

pinClock();

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } }));

const content = (over: Record<string, unknown> = {}) => ({
  subject: 'Your statement',
  from: 'Bank <alerts@bank.test>',
  to: 'me@gmail.test',
  date: '2026-10-13T10:00:00Z',
  html: '<p>Hello <b>there</b></p>',
  text: null,
  attachments: [],
  tooLarge: false,
  ...over,
});
const fail = (status: number, code: string) =>
  vi.mocked(api.GET).mockRejectedValue(new ApiError(status, { code, message: 'server wording', timestamp: '2026-11-07T00:00:00Z' }));

const item = {
  id: 'ledger-1',
  gmailMessageId: 'g-1',
  connectionEmail: 'me@gmail.test',
  senderAddress: 'alerts@bank.test',
  subject: 'Your statement',
  internalDate: '2026-10-13T10:00:00Z',
  discoveredAt: '2026-10-13T10:00:00Z',
  status: 'UNRESOLVED_ACCOUNT',
  attemptCount: 0,
} as never;

beforeEach(() => vi.clearAllMocks());

describe('ViewEmailDialog', () => {
  it('shows a loading state, then asks for the ledger id once', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: content() } as never);
    renderWithQuery(<ViewEmailDialog ledgerId="ledger-1" onClose={vi.fn()} />);
    expect(screen.getByTestId('view-email-loading')).toBeInTheDocument();
    await screen.findByTestId('view-email-frame');
    expect(api.GET).toHaveBeenCalledTimes(1);
    expect(api.GET).toHaveBeenCalledWith('/api/v1/gmail/messages/{ledgerId}/content', { params: { path: { ledgerId: 'ledger-1' } } });
  });

  it('puts the subject in the header with "from · dd/mm/yyyy, time · to"', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: content() } as never);
    renderWithQuery(<ViewEmailDialog ledgerId="ledger-1" onClose={vi.fn()} />);
    expect(await screen.findByText('Your statement')).toBeInTheDocument();
    expect(screen.getByText(/Bank <alerts@bank\.test> · 13\/10\/2026, .*(am|pm) · me@gmail\.test/)).toBeInTheDocument();
  });

  it('renders HTML in a sandboxed iframe: no scripts, no same-origin, a CSP with no images', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: content() } as never);
    renderWithQuery(<ViewEmailDialog ledgerId="ledger-1" onClose={vi.fn()} />);
    const frame = (await screen.findByTestId('view-email-frame')) as HTMLIFrameElement;
    const sandbox = frame.getAttribute('sandbox') ?? '';
    expect(sandbox.split(' ').sort()).toEqual(['allow-popups', 'allow-popups-to-escape-sandbox']);
    expect(sandbox).not.toContain('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
    const doc = frame.getAttribute('srcdoc') ?? '';
    expect(doc).toContain("default-src 'none'; style-src 'unsafe-inline'; img-src 'none'");
    expect(doc).toContain('<p>Hello <b>there</b></p>');
    expect(doc).toContain('width:100%');
  });

  it('renders a plain-text mail in a pre-wrap block with no iframe', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: content({ html: null, text: 'Line one\nLine two' }) } as never);
    renderWithQuery(<ViewEmailDialog ledgerId="ledger-1" onClose={vi.fn()} />);
    const block = await screen.findByTestId('view-email-text');
    expect(block).toHaveTextContent('Line one');
    expect(block.className).toContain('whitespace-pre-wrap');
    expect(screen.queryByTestId('view-email-frame')).toBeNull();
  });

  it('says the email is too large to show when the server could not render it', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: content({ html: null, text: null, tooLarge: true }) } as never);
    renderWithQuery(<ViewEmailDialog ledgerId="ledger-1" onClose={vi.fn()} />);
    expect(await screen.findByTestId('view-email-too-large')).toHaveTextContent('Open it in Gmail');
    expect(screen.queryByTestId('view-email-frame')).toBeNull();
  });

  it('lists attachments as "name · size", names only', async () => {
    vi.mocked(api.GET).mockResolvedValue(
      { data: content({ attachments: [{ filename: 'statement.pdf', mimeType: 'application/pdf', size: 2048 }, { filename: 'tiny.txt', mimeType: 'text/plain', size: 12 }] }) } as never,
    );
    renderWithQuery(<ViewEmailDialog ledgerId="ledger-1" onClose={vi.fn()} />);
    const list = await screen.findByTestId('view-email-attachments');
    expect(within(list).getByText('statement.pdf · 2 KB')).toBeInTheDocument();
    expect(within(list).getByText('tiny.txt · 12 B')).toBeInTheDocument();
    expect(within(list).queryByRole('link')).toBeNull();
  });

  it('says so when the email is gone from the mailbox', async () => {
    fail(410, 'GMAIL_MESSAGE_GONE');
    renderWithQuery(<ViewEmailDialog ledgerId="ledger-1" subject="Your statement" onClose={vi.fn()} />);
    expect(await screen.findByText('This email is no longer in your mailbox.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('points to Connections when the mailbox needs reconnecting', async () => {
    fail(409, 'GMAIL_RECONNECT_REQUIRED');
    renderWithQuery(<ViewEmailDialog ledgerId="ledger-1" onClose={vi.fn()} />);
    expect(await screen.findByText('Reconnect this mailbox to view the email.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Connections' })).toHaveAttribute('href', '/settings/connections');
  });

  it('offers Retry on any other failure and loads the mail when it works', async () => {
    fail(502, 'GMAIL_UNAVAILABLE');
    renderWithQuery(<ViewEmailDialog ledgerId="ledger-1" onClose={vi.fn()} />);
    expect(await screen.findByText("Couldn't load this email.")).toBeInTheDocument();
    vi.mocked(api.GET).mockResolvedValue({ data: content() } as never);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByTestId('view-email-frame');
    expect(api.GET).toHaveBeenCalledTimes(2);
  });

  it('closes from the Close button', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: content() } as never);
    const onClose = vi.fn();
    renderWithQuery(<ViewEmailDialog ledgerId="ledger-1" onClose={onClose} />);
    await screen.findByTestId('view-email-frame');
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe('Details: View email', () => {
  it('sits next to Open in Gmail, and nothing is fetched until it is clicked', async () => {
    renderWithQuery(<Details item={item} archived={false} />);
    const view = screen.getByRole('button', { name: 'View email' });
    const open = screen.getByRole('link', { name: 'Open in Gmail' });
    expect(view.parentElement).toBe(open.parentElement);
    expect(view.compareDocumentPosition(open) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(api.GET).not.toHaveBeenCalled();

    vi.mocked(api.GET).mockResolvedValue({ data: content() } as never);
    fireEvent.click(view);
    await screen.findByTestId('view-email-frame');
    expect(api.GET).toHaveBeenCalledTimes(1);
  });
});
