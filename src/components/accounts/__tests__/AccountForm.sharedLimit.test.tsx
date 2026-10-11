import '@/test/next-mocks';

import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

const mutations = vi.hoisted(() => {
  const m = () => ({ mutateAsync: vi.fn(), isPending: false });
  return {
    createAccountMutation: m(),
    updateAccountMutation: m(),
    closeAccountMutation: m(),
    reopenAccountMutation: m(),
    deleteAccountMutation: m(),
    previewGmailCleanupMutation: m(),
    executeGmailCleanupMutation: m(),
  };
});

vi.mock('@/components/accounts/account-form/useAccountFormMutations', () => ({
  useAccountFormMutations: () => mutations,
}));
vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { formatMoney } from '@/lib/utils';

import { AccountForm } from '../AccountForm';

const hdfc = {
  id: 'p-hdfc',
  name: 'HDFC cards',
  creditLimit: 500000,
  owed: 0,
  available: 500000,
  utilizationPct: 0,
  memberCount: 1,
  openMemberCount: 1,
};

const card = (over: Record<string, unknown>) => ({
  id: 'c1',
  name: 'Regalia',
  type: 'credit_card',
  last4: '1234',
  creditLimit: 200000,
  anniversaryDate: '2026-01-01',
  excludeFromNetAsset: false,
  financialPosition: 'liability',
  cardholders: [],
  warnings: [],
  ...over,
});

function submitForm() {
  fireEvent.submit(document.getElementById('account-form') as HTMLFormElement);
}

async function sentBody(kind: 'create' | 'update') {
  const m = kind === 'create' ? mutations.createAccountMutation : mutations.updateAccountMutation;
  await waitFor(() => expect(m.mutateAsync).toHaveBeenCalledTimes(1));
  return m.mutateAsync.mock.calls[0][0].body;
}

describe('AccountForm: shared credit limit', () => {
  beforeEach(() => {
    for (const m of Object.values(mutations)) m.mutateAsync.mockReset();
    mutations.createAccountMutation.mutateAsync.mockResolvedValue({ account: { id: 'new' }, failedIdentifiers: [] });
    mutations.updateAccountMutation.mutateAsync.mockResolvedValue({ id: 'c1' });
    vi.mocked(toast.error).mockReset();
    // Another card already draws on the HDFC pool.
    vi.mocked(api.GET).mockReset();
    vi.mocked(api.GET).mockResolvedValue({ data: [card({ id: 'other', limitPool: hdfc })] } as never);
  });

  it('a card with its own limit sends no pool and keeps the limit required', async () => {
    renderWithQuery(<AccountForm account={card({}) as never} />);

    expect(screen.getByLabelText('Credit Limit')).toBeRequired();
    submitForm();

    const body = await sentBody('update');
    expect(body.limitPool).toBeNull();
    expect(body.creditLimit).toBe(200000);
  });

  it('the pools on offer come from the accounts list', async () => {
    renderWithQuery(<AccountForm account={card({}) as never} />);

    expect(await screen.findByRole('option', { name: `HDFC cards · ${formatMoney(500000)}` })).toBeInTheDocument();
  });

  it('joining an existing pool sends its id with the shown name and amount, and the own limit becomes optional', async () => {
    renderWithQuery(<AccountForm account={card({ creditLimit: 100000 }) as never} />);

    fireEvent.click(await screen.findByRole('option', { name: `HDFC cards · ${formatMoney(500000)}` }));
    expect(screen.getByLabelText('Own Limit (Optional)')).not.toBeRequired();
    expect(screen.getByText('Leave empty to let this card use the whole shared limit.')).toBeInTheDocument();
    submitForm();

    const body = await sentBody('update');
    expect(body.limitPool).toEqual({ id: 'p-hdfc', name: 'HDFC cards', creditLimit: 500000 });
    expect(body.creditLimit).toBe(100000);
  });

  it('an emptied own limit on a pooled card is sent as null', async () => {
    renderWithQuery(<AccountForm account={card({ creditLimit: null, limitPool: hdfc }) as never} />);

    expect(screen.getByLabelText('Own Limit (Optional)')).toHaveValue(null);
    submitForm();

    const body = await sentBody('update');
    expect(body.creditLimit).toBeNull();
    expect(body.limitPool.id).toBe('p-hdfc');
  });

  it('a card already in a pool starts on it, and editing the pool sends the new name and amount', async () => {
    renderWithQuery(<AccountForm account={card({ creditLimit: null, limitPool: hdfc }) as never} />);

    expect(screen.getAllByTestId('select')[0]).toHaveAttribute('data-value', 'p-hdfc');
    fireEvent.change(screen.getByLabelText('Shared Limit Name'), { target: { value: 'HDFC Bank' } });
    fireEvent.change(screen.getByLabelText('Shared Limit Amount'), { target: { value: '650000' } });
    submitForm();

    const body = await sentBody('update');
    expect(body.limitPool).toEqual({ id: 'p-hdfc', name: 'HDFC Bank', creditLimit: 650000 });
  });

  it('leaving a pool sends no pool and needs the own limit back', async () => {
    renderWithQuery(<AccountForm account={card({ creditLimit: 100000, limitPool: hdfc }) as never} />);

    fireEvent.click(screen.getByRole('option', { name: 'None, this card has its own limit' }));
    expect(screen.getByLabelText('Credit Limit')).toBeRequired();
    expect(screen.queryByLabelText('Shared Limit Name')).toBeNull();
    submitForm();

    const body = await sentBody('update');
    expect(body.limitPool).toBeNull();
    expect(body.creditLimit).toBe(100000);
  });

  it('creating a card with a new shared limit sends a pool without an id and no own limit', async () => {
    renderWithQuery(<AccountForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Credit Card' }));
    fireEvent.change(screen.getByLabelText('Account Name'), { target: { value: 'Millennia' } });
    fireEvent.change(screen.getByLabelText('Last 4 Digits'), { target: { value: '5678' } });
    fireEvent.change(screen.getByLabelText('Card Anniversary Date'), { target: { value: '01/01/2026' } });
    fireEvent.click(screen.getByRole('option', { name: 'New shared limit…' }));
    fireEvent.change(screen.getByLabelText('Shared Limit Name'), { target: { value: 'HDFC cards' } });
    fireEvent.change(screen.getByLabelText('Shared Limit Amount'), { target: { value: '500000' } });
    submitForm();

    const body = await sentBody('create');
    expect(body.type).toBe('credit_card');
    expect(body.limitPool).toEqual({ id: null, name: 'HDFC cards', creditLimit: 500000 });
    expect(body.creditLimit).toBeNull();
  });

  it('a pool without a name or amount is not sent and the toast says what is missing', async () => {
    renderWithQuery(<AccountForm account={card({ creditLimit: null }) as never} />);

    fireEvent.click(screen.getByRole('option', { name: 'New shared limit…' }));
    submitForm();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Credit card needs shared limit name, shared limit amount.')
    );
    expect(mutations.updateAccountMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('an unpooled card without a limit is still refused', async () => {
    renderWithQuery(<AccountForm account={card({ creditLimit: null }) as never} />);

    submitForm();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Credit card needs credit limit.'));
    expect(mutations.updateAccountMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('only credit cards fetch the pools and show the picker', () => {
    renderWithQuery(<AccountForm />);

    expect(screen.queryByText('Shared Limit', { exact: true })).toBeNull();
    expect(vi.mocked(api.GET).mock.calls.map((c) => c[0])).not.toContain('/api/v1/accounts');
  });
});
