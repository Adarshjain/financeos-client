import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/test/renderWithQuery';

vi.mock('@/components/jobs/useJobStatusPolling', () => ({ useJobStatusPolling: () => ({ isPolling: false }) }));
vi.mock('@/components/jobs/jobsBus', () => ({ emitJobStarted: vi.fn() }));

import { useIngestForm } from '../components/useIngestForm';

const acct = (id: string, type: string, extra: Record<string, unknown> = {}) => ({ id, name: id, type, warnings: [], ...extra }) as any;
const accounts = [
  acct('bank', 'bank_account'),
  acct('card', 'credit_card'),
  acct('broker', 'broker'),
  acct('wallet', 'generic'),
  acct('closed', 'bank_account', { closedOn: '2020-01-01' }),
];
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
);
const selected = (initialAccountId?: string) =>
  renderHook(() => useIngestForm({ accounts, initialAccountId }), { wrapper }).result.current.selectedAccountId;

describe('useIngestForm ?account= preselect', () => {
  it('preselects an uploadable bank or card account', () => {
    expect(selected('bank')).toBe('bank');
    expect(selected('card')).toBe('card');
  });
  it('ignores accounts that cannot take statements: broker, wallet, closed', () => {
    expect(selected('broker')).toBe('');
    expect(selected('wallet')).toBe('');
    expect(selected('closed')).toBe('');
  });
  it('ignores unknown or missing ids', () => {
    expect(selected('nope')).toBe('');
    expect(selected(undefined)).toBe('');
  });
});
