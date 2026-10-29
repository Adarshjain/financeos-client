import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { GmailSenderResponse } from '@/lib/api/types';

import { SenderDialog } from './SenderDialog';
import { SendersCard } from './SendersCard';

const senders = [
  { id: 's1', name: 'HDFC InstaAlert', senderAddress: 'alerts@hdfcbank.net', enabled: true },
  { id: 's2', name: null, senderAddress: 'no-reply@americanexpress.com', enabled: false },
] as GmailSenderResponse[];

describe('SendersCard', () => {
  it('lists sender, address and On/Off status, with the unnamed fallback', () => {
    render(<SendersCard senders={senders} onOpenAddSender={vi.fn()} onOpenEditSender={vi.fn()} />);
    expect(screen.getByText('Allowed senders')).toBeInTheDocument();
    expect(screen.getByText('Only mail from these addresses is read')).toBeInTheDocument();
    expect(screen.getAllByText('HDFC InstaAlert').length).toBeGreaterThan(0);
    expect(screen.getAllByText('(Unnamed sender)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('alerts@hdfcbank.net').length).toBeGreaterThan(0);
    expect(screen.getAllByText('On').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Off').length).toBeGreaterThan(0);
  });

  it('opens Add sender and Edit', () => {
    const add = vi.fn();
    const edit = vi.fn();
    render(<SendersCard senders={senders} onOpenAddSender={add} onOpenEditSender={edit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add sender' }));
    expect(add).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    expect(edit).toHaveBeenCalledWith(senders[0]);
  });

  it('shows today\'s empty text with an Add your first sender action', () => {
    const add = vi.fn();
    render(<SendersCard senders={[]} onOpenAddSender={add} onOpenEditSender={vi.fn()} />);
    expect(screen.getByText('No allowed senders yet')).toBeInTheDocument();
    expect(screen.getByText('Add banks, credit cards, or service alerts to the allowlist.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add your first sender' }));
    expect(add).toHaveBeenCalledTimes(1);
  });
});

function dialog(editing: GmailSenderResponse | null, over: Partial<React.ComponentProps<typeof SenderDialog>> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    editingSender: editing,
    senderName: editing?.name ?? '',
    setSenderName: vi.fn(),
    senderAddress: editing?.senderAddress ?? '',
    setSenderAddress: vi.fn(),
    senderEnabled: editing?.enabled ?? true,
    setSenderEnabled: vi.fn(),
    submittingSender: false,
    onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
    onDelete: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
  render(<SenderDialog {...props} />);
  return props;
}

describe('SenderDialog', () => {
  it('adds: titled Add, no Delete, enabled by default, saves', () => {
    const p = dialog(null, { senderAddress: 'a@b.test' });
    expect(screen.getByText('Add allowed sender')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Add sender' }));
    expect(p.onSubmit).toHaveBeenCalled();
  });

  it('reports typing and the switch', () => {
    const p = dialog(null);
    fireEvent.change(screen.getByLabelText(/Sender email address/), { target: { value: 'x@y.test' } });
    expect(p.setSenderAddress).toHaveBeenCalledWith('x@y.test');
    fireEvent.click(screen.getByRole('switch'));
    expect(p.setSenderEnabled).toHaveBeenCalledWith(false);
  });

  it('edits: titled Edit, with Delete as the tertiary action', () => {
    dialog(senders[0]);
    expect(screen.getByText('Edit allowed sender')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('confirms before deleting, then deletes and closes', async () => {
    const p = dialog(senders[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(p.onDelete).not.toHaveBeenCalled();
    expect(screen.getByText("Mail from this address is no longer read. Transactions already imported stay. This can't be undone.")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!);
    await waitFor(() => expect(p.onDelete).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(p.onOpenChange).toHaveBeenCalledWith(false));
  });

  it('keeps both dialogs open when the delete fails', async () => {
    const p = dialog(senders[0], { onDelete: vi.fn().mockResolvedValue(false) });
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' }).at(-1)!);
    await waitFor(() => expect(p.onDelete).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Delete' }).at(-1)).toBeEnabled());
    expect(screen.getByText("Mail from this address is no longer read. Transactions already imported stay. This can't be undone.")).toBeInTheDocument();
    expect(screen.getByText('Edit allowed sender')).toBeInTheDocument();
    expect(p.onOpenChange).not.toHaveBeenCalled();
  });

  it('keeps the sender when the delete confirm is cancelled', () => {
    const p = dialog(senders[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel' }).at(-1)!);
    expect(p.onDelete).not.toHaveBeenCalled();
  });
});
