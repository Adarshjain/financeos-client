import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/test/renderWithQuery';

vi.mock('@/components/jobs/useJobStatusPolling', () => ({
  useJobStatusPolling: () => ({ isPolling: false }),
}));
vi.mock('@/components/jobs/jobsBus', () => ({ emitJobStarted: vi.fn() }));

import { useIngestForm } from '../components/useIngestForm';

const acct = (id: string, type: string, extra: Record<string, unknown> = {}) =>
  ({ id, name: id, type, warnings: [], ...extra }) as any;

describe('useIngestForm uploadable accounts', () => {
  it('offers only open bank and credit card accounts (brokers and Wallet/Cash have no statements)', () => {
    const accounts = [
      acct('bank', 'bank_account'),
      acct('card', 'credit_card'),
      acct('broker', 'broker'),
      acct('wallet', 'generic'),
      acct('closed-bank', 'bank_account', { closedOn: '2020-01-01' }),
    ];
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useIngestForm({ accounts }), { wrapper });

    expect(result.current.uploadableAccounts.map((a: { id: string }) => a.id)).toEqual(['bank', 'card']);
  });
});
