import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);

import type { CreditLimitPool } from '@/lib/account.types';
import { formatMoney } from '@/lib/utils';

import { SharedLimitField } from '../SharedLimitField';

const hdfc: CreditLimitPool = {
  id: 'p-hdfc',
  name: 'HDFC cards',
  creditLimit: 500000,
  owed: 0,
  available: 500000,
  utilizationPct: 0,
  memberCount: 3,
  openMemberCount: 3,
};

describe('SharedLimitField', () => {
  it('offers none, every pool with its limit, and a new shared limit', () => {
    render(<SharedLimitField pools={[hdfc]} choice="none" onChoiceChange={vi.fn()} />);

    expect(screen.getByRole('option', { name: 'None, this card has its own limit' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: `HDFC cards · ${formatMoney(500000)}` })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'New shared limit…' })).toBeInTheDocument();
  });

  it('picking an option reports its value', () => {
    const onChoiceChange = vi.fn();
    render(<SharedLimitField pools={[hdfc]} choice="none" onChoiceChange={onChoiceChange} />);

    fireEvent.click(screen.getByRole('option', { name: `HDFC cards · ${formatMoney(500000)}` }));
    fireEvent.click(screen.getByRole('option', { name: 'New shared limit…' }));

    expect(onChoiceChange.mock.calls).toEqual([['p-hdfc'], ['new']]);
  });

  it('with no shared limit picked there is no name or amount field', () => {
    render(<SharedLimitField pools={[hdfc]} choice="none" onChoiceChange={vi.fn()} />);

    expect(screen.queryByLabelText('Shared Limit Name')).toBeNull();
    expect(screen.queryByLabelText('Shared Limit Amount')).toBeNull();
  });

  it('a new shared limit asks for an empty, required name and amount', () => {
    render(<SharedLimitField pools={[hdfc]} choice="new" onChoiceChange={vi.fn()} />);

    const name = screen.getByLabelText('Shared Limit Name');
    const amount = screen.getByLabelText('Shared Limit Amount');
    expect(name).toHaveValue('');
    expect(name).toBeRequired();
    expect(name).toHaveAttribute('name', 'limitPoolName');
    expect(amount).toHaveValue(null);
    expect(amount).toBeRequired();
    expect(amount).toHaveAttribute('name', 'limitPoolLimit');
    expect(screen.queryByText(/other account/)).toBeNull();
  });

  it('an existing pool prefills its name and amount and warns about the other accounts it changes', () => {
    render(<SharedLimitField pools={[hdfc]} choice="p-hdfc" onChoiceChange={vi.fn()} />);

    expect(screen.getByLabelText('Shared Limit Name')).toHaveValue('HDFC cards');
    expect(screen.getByLabelText('Shared Limit Amount')).toHaveValue(500000);
    expect(screen.getByText(/also changes it for the 3 other accounts sharing this limit/)).toBeInTheDocument();
  });

  it('the edited account is not counted among the others in its own pool', () => {
    render(<SharedLimitField pools={[hdfc]} choice="p-hdfc" onChoiceChange={vi.fn()} currentPoolId="p-hdfc" />);

    expect(screen.getByText(/also changes it for the 2 other accounts/)).toBeInTheDocument();
  });

  it('a pool shared with exactly one other account says so in the singular, and a pool of only this account says nothing', () => {
    const { rerender } = render(
      <SharedLimitField pools={[{ ...hdfc, memberCount: 2 }]} choice="p-hdfc" onChoiceChange={vi.fn()} currentPoolId="p-hdfc" />
    );
    expect(screen.getByText(/also changes it for the 1 other account sharing this limit/)).toBeInTheDocument();

    rerender(
      <SharedLimitField pools={[{ ...hdfc, memberCount: 1 }]} choice="p-hdfc" onChoiceChange={vi.fn()} currentPoolId="p-hdfc" />
    );
    expect(screen.queryByText(/other account/)).toBeNull();
  });
});
