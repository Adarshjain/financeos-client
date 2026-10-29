import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
import { QueryClientProvider } from '@tanstack/react-query';

import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import type { DashboardResponse } from '@/lib/dashboards.types';
import type { ReportSummaryResponse } from '@/lib/reports.types';
import { createTestQueryClient } from '@/test/renderWithQuery';

import {
  DEFAULT_SHORTCUTS,
  parseShortcutId,
  resolveShortcut,
  resolveShortcuts,
  SHORTCUT_PAGES,
  type ShortcutEntities,
  useShortcuts,
} from './shortcutsCatalog';

const ACC = '11111111-1111-1111-1111-111111111111';
const REP = '22222222-2222-2222-2222-222222222222';
const DASH = '33333333-3333-3333-3333-333333333333';
const entities: ShortcutEntities = {
  accounts: [{ id: ACC, name: 'HDFC Savings' } as Account],
  reports: [{ id: REP, name: 'Monthly spend' } as ReportSummaryResponse],
  dashboards: [{ id: DASH, name: 'Investments' } as DashboardResponse],
};

describe('parseShortcutId', () => {
  it('splits kind and value at the first colon', () => {
    expect(parseShortcutId('page:/transactions/review')).toEqual({ kind: 'page', value: '/transactions/review' });
    expect(parseShortcutId(`account:${ACC}`)).toEqual({ kind: 'account', value: ACC });
  });
  it('rejects an unknown kind, a bare kind and characters outside the pattern', () => {
    expect(parseShortcutId('nope:x')).toBeNull();
    expect(parseShortcutId('page:')).toBeNull();
    expect(parseShortcutId('page:/a b')).toBeNull();
  });
});

describe('resolveShortcut', () => {
  it('a page by its path; an unknown page is hidden', () => {
    expect(resolveShortcut('page:/transactions/review')).toMatchObject({ label: 'Needs review', href: '/transactions/review', actionId: null });
    expect(resolveShortcut('page:/nowhere')).toBeNull();
  });

  it('every listed page resolves under its own label with its Legacy-shaped href', () => {
    for (const page of SHORTCUT_PAGES) {
      expect(resolveShortcut(`page:${page.href}`)).toMatchObject({ label: page.label, href: page.href });
    }
  });

  it('dialog actions carry their dialog and no href; page actions are links', () => {
    expect(resolveShortcut('action:add-transaction')).toMatchObject({ label: 'Add transaction', href: null, actionId: 'add-transaction' });
    expect(resolveShortcut('action:record-lending')).toMatchObject({ href: null, actionId: 'record-lending' });
    expect(resolveShortcut('action:ask-chat')).toMatchObject({ label: 'Ask chat', href: '/chat', actionId: null });
    expect(resolveShortcut('action:nope')).toBeNull();
    expect(resolveShortcut('action:toString')).toBeNull();
  });

  it('an account, report or dashboard resolves to its page, hidden once gone or while its list is loading', () => {
    expect(resolveShortcut(`account:${ACC}`, entities)).toMatchObject({ label: 'HDFC Savings', href: `/accounts/${ACC}` });
    expect(resolveShortcut(`report:${REP}`, entities)).toMatchObject({ label: 'Monthly spend', href: `/reports/${REP}` });
    expect(resolveShortcut(`dashboard:${DASH}`, entities)).toMatchObject({ label: 'Investments', href: `/dashboards/${DASH}` });
    expect(resolveShortcut(`account:${REP}`, entities)).toBeNull();
    expect(resolveShortcut(`account:${ACC}`)).toBeNull();
  });

  it('every default resolves', () => {
    expect(resolveShortcuts(DEFAULT_SHORTCUTS)).toHaveLength(DEFAULT_SHORTCUTS.length);
  });

  it('keeps order, drops unknown ids and repeats', () => {
    const items = resolveShortcuts(['page:/upcoming', 'page:/nowhere', 'action:add-transaction', 'page:/upcoming']);
    expect(items.map((i) => i.id)).toEqual(['page:/upcoming', 'action:add-transaction']);
  });
});

describe('useShortcuts', () => {
  beforeEach(() => vi.resetAllMocks());
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
  );

  it('fetches nothing for page and action ids', async () => {
    const { result } = renderHook(() => useShortcuts(['page:/upcoming', 'action:add-transaction']), { wrapper });
    expect(result.current.pending).toBe(false);
    expect(result.current.items).toHaveLength(2);
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('an account id waits for the accounts list, then resolves by name', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [{ id: ACC, name: 'HDFC Savings' }] } as never);
    const { result } = renderHook(() => useShortcuts([`account:${ACC}`]), { wrapper });
    expect(result.current.pending).toBe(true);
    expect(result.current.items).toEqual([]);
    await waitFor(() => expect(result.current.items.map((i) => i.label)).toEqual(['HDFC Savings']));
    expect(result.current.pending).toBe(false);
  });
});
