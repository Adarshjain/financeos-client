import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AccountType } from '@/lib/types';

import { AccountFormFields } from './AccountFormFields';
import { emptyValues } from './accountFormModel';

const loadBankDomains = vi.fn();
vi.mock('@/features/data-sources/connections/gmailActions', () => ({
  loadBankDomains: () => loadBankDomains(),
}));

function renderFields(over: Partial<React.ComponentProps<typeof AccountFormFields>> & { bank?: string } = {}) {
  const { bank = 'hdfc', ...rest } = over;
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AccountFormFields
        values={{ ...emptyValues(AccountType.BANK_ACCOUNT), bank }}
        errors={{}}
        isEdit={false}
        existingBankIds={[]}
        today="2026-01-01"
        pools={[]}
        poolOthers={0}
        identifiersLoading={false}
        identifierError={null}
        identifierOptions={[]}
        onChange={vi.fn()}
        onLimitPoolChoice={vi.fn()}
        onCreateIdentifier={vi.fn()}
        onIdentifiersChange={vi.fn()}
        {...rest}
      />
    </QueryClientProvider>,
  );
}

const ok = (data: unknown) => ({ success: true, data });

describe('bank domains hint', () => {
  it('shows the helper and a See domains sheet for a new bank', async () => {
    loadBankDomains.mockResolvedValue(ok([{ bankId: 'hdfc', domains: ['hdfcbank.net', 'hdfcbank.bank.in'] }]));
    renderFields();
    expect(await screen.findByText(/We'll read HDFC Bank's emails from its addresses/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'See domains' }));
    expect(await screen.findByText('hdfcbank.bank.in')).toBeInTheDocument();
  });

  it('shows nothing when the user already has an account at that bank', async () => {
    loadBankDomains.mockResolvedValue(ok([{ bankId: 'hdfc', domains: ['hdfcbank.net'] }]));
    renderFields({ existingBankIds: ['hdfc'] });
    await Promise.resolve();
    expect(screen.queryByText(/We'll read/)).toBeNull();
  });

  it('shows nothing when editing', async () => {
    loadBankDomains.mockResolvedValue(ok([{ bankId: 'hdfc', domains: ['hdfcbank.net'] }]));
    renderFields({ isEdit: true });
    await Promise.resolve();
    expect(screen.queryByText(/We'll read/)).toBeNull();
  });

  it('shows nothing while the accounts list is still loading', () => {
    renderFields({ existingBankIds: undefined });
    expect(screen.queryByText(/We'll read/)).toBeNull();
  });

  it('shows nothing when the bank has no domains', async () => {
    loadBankDomains.mockResolvedValue(ok([{ bankId: 'hdfc', domains: [] }]));
    renderFields();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(/We'll read/)).toBeNull();
  });
});
