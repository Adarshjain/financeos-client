import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Card } from '@/lib/account.types';

import { AddCardDialog, ReplaceCardDialog } from './CardFormDialogs';
import { buildAddCard, buildAddHolder, buildReplaceCard } from './cardsFormsModel';
import { AddHolderDialog } from './HolderFormDialogs';

const user = userEvent.setup({ pointerEventsCheck: 0 });
const today = '2026-10-13';
const ok = () => vi.fn().mockResolvedValue(null);

describe('cards from a suggestion: bodies', () => {
  it('send fromSuggestionId only when there is one', () => {
    expect(buildAddCard({ last4: '1234', issuedOn: today }, today)).toEqual({ ok: true, body: { last4: '1234', issuedOn: today } });
    const withId = buildAddCard({ last4: '1234', issuedOn: today, fromSuggestionId: 's1' }, today);
    expect(withId).toMatchObject({ ok: true, body: { fromSuggestionId: 's1' } });
    const plain = buildReplaceCard({ newLast4: '1234', issuedOn: today }, today);
    expect(plain.ok && 'fromSuggestionId' in plain.body).toBe(false);
    expect(buildReplaceCard({ newLast4: '1234', issuedOn: today, fromSuggestionId: 's1' }, today)).toMatchObject({
      ok: true,
      body: { fromSuggestionId: 's1' },
    });
  });

  it('require a relationship for a holder that has none picked', () => {
    const base = { name: 'Asha', spendLimit: '', openedOn: today, last4: '', issuedOn: today };
    expect(buildAddHolder({ ...base, relationship: '' }, today)).toEqual({ ok: false, errors: { relationship: 'Pick who the holder is.' } });
    const built = buildAddHolder({ ...base, relationship: 'SPOUSE', fromSuggestionId: 's1' }, today);
    expect(built).toMatchObject({ ok: true, body: { relationship: 'SPOUSE', fromSuggestionId: 's1' } });
    const plain = buildAddHolder({ ...base, relationship: 'SPOUSE' }, today);
    expect(plain.ok && 'fromSuggestionId' in plain.body).toBe(false);
  });
});

describe('AddCardDialog from a suggestion', () => {
  it('prefills the number with the caption and sends fromSuggestionId', async () => {
    const onSubmit = ok();
    render(<AddCardDialog title="Add a card" description="Me" submitLabel="Add card" today={today} fromSuggestion={{ id: 's1', last4: '9911' }} onSubmit={onSubmit} onClose={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: /^Last 4 digits/ })).toHaveValue('9911');
    expect(screen.getByText('From your email')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add card' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ last4: '9911', fromSuggestionId: 's1' })));
  });

  it('shows the server message on a mismatch and keeps the dialog open', async () => {
    const onSubmit = vi.fn().mockResolvedValue("The card number doesn't match the suggestion");
    const onClose = vi.fn();
    render(<AddCardDialog title="Add a card" description="Me" submitLabel="Add card" today={today} fromSuggestion={{ id: 's1', last4: '9911' }} onSubmit={onSubmit} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Add card' }));
    expect(await screen.findByText("The card number doesn't match the suggestion")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has no caption and no fromSuggestionId without a suggestion', async () => {
    const onSubmit = ok();
    render(<AddCardDialog title="Add a card" description="Me" submitLabel="Add card" today={today} onSubmit={onSubmit} onClose={vi.fn()} />);
    expect(screen.queryByText('From your email')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: /^Last 4 digits/ }), { target: { value: '1234' } });
    await user.click(screen.getByRole('button', { name: 'Add card' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect('fromSuggestionId' in onSubmit.mock.calls[0][0]).toBe(false);
  });
});

describe('ReplaceCardDialog from a suggestion', () => {
  const card = { id: 'k1', cardholderId: 'h1', last4: '1111' } as Card;

  it('prefills the new number with the caption and sends fromSuggestionId', async () => {
    const onSubmit = ok();
    render(<ReplaceCardDialog card={card} holderName="Me" today={today} fromSuggestion={{ id: 's2', last4: '5678' }} onSubmit={onSubmit} onClose={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: /^New last 4 digits/ })).toHaveValue('5678');
    expect(screen.getByText('From your email')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Replace card' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ newLast4: '5678', fromSuggestionId: 's2' })));
  });
});

describe('AddHolderDialog from a suggestion', () => {
  it('prefills the number, leaves the relationship unpicked and blocks Create until it is picked', async () => {
    const onSubmit = ok();
    render(<AddHolderDialog isBank={false} accountName="Regalia" today={today} fromSuggestion={{ id: 's3', last4: '0082' }} onSubmit={onSubmit} onClose={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: /^Last 4 digits/ })).toHaveValue('0082');
    expect(screen.getByText('From your email')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'Asha' } });
    await user.click(screen.getByRole('button', { name: 'Add cardholder' }));
    expect(await screen.findByText('Pick who the holder is.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    await user.click(screen.getByRole('combobox', { name: /^Relationship/ }));
    await user.click(screen.getByRole('option', { name: 'Parent' }));
    await user.click(screen.getByRole('button', { name: 'Add cardholder' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ personName: 'Asha', relationship: 'PARENT', last4: '0082', fromSuggestionId: 's3' })),
    );
  });

  it('keeps Spouse as the default and sends no fromSuggestionId without a suggestion', async () => {
    const onSubmit = ok();
    render(<AddHolderDialog isBank={false} accountName="Regalia" today={today} onSubmit={onSubmit} onClose={vi.fn()} />);
    expect(screen.queryByText('From your email')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'Asha' } });
    await user.click(screen.getByRole('button', { name: 'Add cardholder' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const body = onSubmit.mock.calls[0][0];
    expect(body.relationship).toBe('SPOUSE');
    expect('fromSuggestionId' in body).toBe(false);
  });
});
