import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AddPastCardDialog } from './CardFormDialogs';
import { buildPastCard, seenHint } from './cardsFormsModel';

const user = userEvent.setup({ pointerEventsCheck: 0 });
const today = '2026-10-13';
const seen = { firstSeen: '2021-05-04', lastSeen: '2025-04-20', mailCount: 63, transactionCount: 100 };

describe('seenHint', () => {
  it('names the counts and the month span', () => {
    expect(seenHint(seen)).toBe('Seen in 63 emails and 100 transactions, May 2021 – Apr 2025');
  });
  it('handles one of each, one month, and counts of one kind', () => {
    expect(seenHint({ firstSeen: '2021-05-04', lastSeen: '2021-05-20', mailCount: 1, transactionCount: 1 })).toBe('Seen in 1 email and 1 transaction, May 2021');
    expect(seenHint({ ...seen, transactionCount: 0 })).toBe('Seen in 63 emails, May 2021 – Apr 2025');
  });
  it('says nothing when the number was never seen', () => {
    expect(seenHint({ mailCount: 0, transactionCount: 0 })).toBeNull();
  });
});

describe('buildPastCard', () => {
  it('builds a body with closedOn', () => {
    expect(buildPastCard({ last4: '1234', issuedOn: '2021-05-04', closedOn: '2025-04-20' }, today)).toEqual({
      ok: true,
      body: { last4: '1234', issuedOn: '2021-05-04', closedOn: '2025-04-20' },
    });
  });
  it('needs 4 digits and both dates, closed not before opened, nothing in the future', () => {
    expect(buildPastCard({ last4: '12', issuedOn: '', closedOn: '' }, today)).toMatchObject({
      ok: false,
      errors: { last4: expect.any(String), issuedOn: expect.any(String), closedOn: expect.any(String) },
    });
    expect(buildPastCard({ last4: '1234', issuedOn: '2025-05-04', closedOn: '2024-01-01' }, today)).toMatchObject({ ok: false, errors: { closedOn: expect.stringContaining('on or after') } });
    expect(buildPastCard({ last4: '1234', issuedOn: '2025-05-04', closedOn: '2027-01-01' }, today)).toMatchObject({ ok: false, errors: { closedOn: expect.stringContaining('on or before today') } });
  });
});

describe('AddPastCardDialog', () => {
  const setup = (loadSeenDates = vi.fn().mockResolvedValue(seen), saved: { id: string; value: string }[] = []) => {
    const onSubmit = vi.fn().mockResolvedValue(null);
    const onConvert = vi.fn().mockResolvedValue(null);
    render(
      <AddPastCardDialog
        description="Arjun"
        today={today}
        holderId="h1"
        loadSeenDates={loadSeenDates}
        loadIdentifiers={vi.fn().mockResolvedValue(saved)}
        onSubmit={onSubmit}
        onConvert={onConvert}
        onClose={vi.fn()}
      />,
    );
    return { onSubmit, onConvert, loadSeenDates };
  };

  it('looks up the number once it has 4 digits, prefills both dates and shows the hint', async () => {
    const { onSubmit, loadSeenDates } = setup();
    await user.type(screen.getByRole('textbox', { name: /^Last 4 digits/ }), '123');
    expect(loadSeenDates).not.toHaveBeenCalled();
    await user.type(screen.getByRole('textbox', { name: /^Last 4 digits/ }), '4');
    expect(await screen.findByText('Seen in 63 emails and 100 transactions, May 2021 – Apr 2025')).toBeInTheDocument();
    expect(loadSeenDates).toHaveBeenCalledWith('1234');
    await waitFor(() => expect(screen.getByLabelText('Opened on')).toHaveValue('04/05/2021'));
    expect(screen.getByLabelText('Closed on')).toHaveValue('20/04/2025');
    await user.click(screen.getByRole('button', { name: 'Add past card' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ last4: '1234', issuedOn: '2021-05-04', closedOn: '2025-04-20' }));
  });

  it('leaves the dates empty and blocks submit when the number was never seen', async () => {
    const { onSubmit } = setup(vi.fn().mockResolvedValue({ mailCount: 0, transactionCount: 0 }));
    await user.type(screen.getByRole('textbox', { name: /^Last 4 digits/ }), '9999');
    await user.click(screen.getByRole('button', { name: 'Add past card' }));
    expect(await screen.findByText('Enter when the card was opened.')).toBeInTheDocument();
    expect(screen.getByText('Enter when the card was closed.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the server message and stays open when adding fails', async () => {
    const onSubmit = vi.fn().mockResolvedValue("Couldn't add the past card. Try again.");
    render(
      <AddPastCardDialog
        description="Arjun"
        today={today}
        holderId="h1"
        loadSeenDates={vi.fn().mockResolvedValue(seen)}
        loadIdentifiers={vi.fn().mockResolvedValue([])}
        onSubmit={onSubmit}
        onConvert={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await user.type(screen.getByRole('textbox', { name: /^Last 4 digits/ }), '1234');
    await waitFor(() => expect(screen.getByLabelText('Closed on')).toHaveValue('20/04/2025'));
    await user.click(screen.getByRole('button', { name: 'Add past card' }));
    expect(await screen.findByText("Couldn't add the past card. Try again.")).toBeInTheDocument();
  });

  it('creates the card plainly when the digits are not a saved number', async () => {
    const { onSubmit, onConvert } = setup(undefined, [{ id: 'i1', value: '9999' }]);
    await user.type(screen.getByRole('textbox', { name: /^Last 4 digits/ }), '1234');
    await waitFor(() => expect(screen.getByLabelText('Closed on')).toHaveValue('20/04/2025'));
    expect(screen.queryByText(/Saved as another number/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Add past card' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ last4: '1234', issuedOn: '2021-05-04', closedOn: '2025-04-20' }));
    expect(onConvert).not.toHaveBeenCalled();
  });

  it('converts the saved number into the card when the digits match one, and says so', async () => {
    const { onSubmit, onConvert } = setup(undefined, [{ id: 'i1', value: '3003' }]);
    await user.type(screen.getByRole('textbox', { name: /^Last 4 digits/ }), '3003');
    expect(await screen.findByText(/saved as another number on this account; it will become this card/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Closed on')).toHaveValue('20/04/2025'));
    await user.click(screen.getByRole('button', { name: 'Add past card' }));
    await waitFor(() => expect(onConvert).toHaveBeenCalledWith('i1', { cardholderId: 'h1', issuedOn: '2021-05-04', closedOn: '2025-04-20' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
