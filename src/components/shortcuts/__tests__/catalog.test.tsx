import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { QueryClientProvider } from '@tanstack/react-query';

import { NAV_ITEMS } from '@/components/layout/navigation/navItems';
import {
  ACTION_SHORTCUTS,
  DEFAULT_SHORTCUTS,
  PAGE_SHORTCUTS,
  parseShortcutId,
  resolveShortcut,
  resolveShortcuts,
  shortcutCatalog,
  type ShortcutEntities,
  useShortcutCatalog,
  useShortcuts,
} from '@/components/shortcuts/catalog';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import type { DashboardResponse } from '@/lib/dashboards.types';
import type { ReportSummaryResponse } from '@/lib/reports.types';
import { createTestQueryClient } from '@/test/renderWithQuery';

const ACC = '11111111-1111-1111-1111-111111111111';
const REP = '22222222-2222-2222-2222-222222222222';
const DASH = '33333333-3333-3333-3333-333333333333';
const account = { id: ACC, name: 'HDFC Savings' } as Account;
const reportRow = { id: REP, name: 'Monthly spend' } as ReportSummaryResponse;
const dashboard = { id: DASH, name: 'Investments' } as DashboardResponse;
const entities: ShortcutEntities = { accounts: [account], reports: [reportRow], dashboards: [dashboard] };

describe('parseShortcutId', () => {
  it('splits kind and value at the first colon', () => {
    expect(parseShortcutId('page:/transactions/review')).toEqual({ kind: 'page', value: '/transactions/review' });
    expect(parseShortcutId('action:add-transaction')).toEqual({ kind: 'action', value: 'add-transaction' });
    expect(parseShortcutId(`account:${ACC}`)).toEqual({ kind: 'account', value: ACC });
    expect(parseShortcutId('page:/reports?type=KPI')).toEqual({ kind: 'page', value: '/reports?type=KPI' });
  });

  it('rejects ids outside the item pattern', () => {
    for (const bad of ['', 'page:', 'foo:/x', 'page /x', 'page:<script>', `page:/${'a'.repeat(200)}`, 'PAGE:/x']) {
      expect(parseShortcutId(bad)).toBeNull();
    }
  });
});

describe('catalog lists', () => {
  it('pages: every nav href once, in nav order, with the nav label (Rewards for its overview)', () => {
    const hrefs = PAGE_SHORTCUTS.map((p) => p.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toEqual([...new Set(Object.values(NAV_ITEMS).map((n) => n.href))]);
    expect(PAGE_SHORTCUTS.find((p) => p.href === '/rewards')?.label).toBe('Rewards');
    expect(PAGE_SHORTCUTS.find((p) => p.href === '/upcoming')).toMatchObject({
      id: 'page:/upcoming', kind: 'page', label: 'Upcoming', actionId: null,
    });
  });

  it('actions: dialogs carry an actionId and no href; page actions carry an href', () => {
    expect(ACTION_SHORTCUTS.map((a) => a.id)).toEqual([
      'action:add-transaction', 'action:record-lending', 'action:import-statement', 'action:ask-chat', 'action:review-queue',
    ]);
    expect(resolveShortcut('action:add-transaction')).toMatchObject({ actionId: 'add-transaction', href: null, label: 'Add transaction' });
    expect(resolveShortcut('action:ask-chat')).toMatchObject({ actionId: null, href: '/chat' });
  });

  it('the default set resolves fully, in order', () => {
    expect(resolveShortcuts(DEFAULT_SHORTCUTS).map((s) => s.id)).toEqual([...DEFAULT_SHORTCUTS]);
  });

  it('shortcutCatalog: pages, actions, then the user`s accounts, reports and dashboards', () => {
    const all = shortcutCatalog(entities);
    expect(all.slice(-3).map((s) => s.id)).toEqual([`account:${ACC}`, `report:${REP}`, `dashboard:${DASH}`]);
    expect(all).toHaveLength(PAGE_SHORTCUTS.length + ACTION_SHORTCUTS.length + 3);
    expect(shortcutCatalog()).toHaveLength(PAGE_SHORTCUTS.length + ACTION_SHORTCUTS.length);
  });
});

describe('resolveShortcut', () => {
  it('resolves the user`s things to their pages', () => {
    expect(resolveShortcut(`account:${ACC}`, entities)).toMatchObject({ kind: 'account', label: 'HDFC Savings', href: `/accounts/${ACC}` });
    expect(resolveShortcut(`report:${REP}`, entities)).toMatchObject({ kind: 'report', label: 'Monthly spend', href: `/reports/${REP}` });
    expect(resolveShortcut(`dashboard:${DASH}`, entities)).toMatchObject({ kind: 'dashboard', label: 'Investments', href: `/dashboards/${DASH}` });
  });

  it('hides unknown pages and actions, gone or not-yet-loaded entities, and malformed ids', () => {
    expect(resolveShortcut('page:/nowhere')).toBeNull();
    expect(resolveShortcut('action:launch-rocket')).toBeNull();
    expect(resolveShortcut('action:toString')).toBeNull();
    expect(resolveShortcut('account:44444444-4444-4444-4444-444444444444', entities)).toBeNull();
    expect(resolveShortcut(`account:${ACC}`)).toBeNull();
    expect(resolveShortcut(`report:${REP}`, { reports: [] })).toBeNull();
    expect(resolveShortcut(`dashboard:${DASH}`, {})).toBeNull();
    expect(resolveShortcut('garbage')).toBeNull();
  });

  it('resolveShortcuts keeps order, drops unknowns and repeats', () => {
    const ids = ['page:/upcoming', 'page:/nowhere', `account:${ACC}`, 'page:/upcoming', 'action:record-lending'];
    expect(resolveShortcuts(ids, entities).map((s) => s.id)).toEqual(['page:/upcoming', `account:${ACC}`, 'action:record-lending']);
  });
});

describe('useShortcuts / useShortcutCatalog', () => {
  const wrapper = () => {
    const qc = createTestQueryClient();
    return function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    };
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockImplementation(((path: string) => {
      if (path === '/api/v1/accounts') return Promise.resolve({ data: [account] });
      if (path === '/api/v1/reports') return Promise.resolve({ data: [reportRow] });
      if (path === '/api/v1/dashboards') return Promise.resolve({ data: [dashboard] });
      return Promise.reject(new Error(path));
    }) as never);
  });

  const fetched = () => (vi.mocked(api.GET).mock.calls as unknown as [string][]).map(([p]) => p);

  it('pages and actions resolve at once with no fetch', () => {
    const ids = ['action:add-transaction', 'page:/upcoming'];
    const { result } = renderHook(() => useShortcuts(ids), { wrapper: wrapper() });
    expect(result.current.pending).toBe(false);
    expect(result.current.items.map((s) => s.id)).toEqual(ids);
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('fetches only the lists the ids need, pending until they load', async () => {
    const ids = [`report:${REP}`, 'page:/upcoming'];
    const { result } = renderHook(() => useShortcuts(ids), { wrapper: wrapper() });
    expect(result.current.pending).toBe(true);
    expect(result.current.items.map((s) => s.id)).toEqual(['page:/upcoming']);
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.items.map((s) => s.id)).toEqual([`report:${REP}`, 'page:/upcoming']);
    expect(fetched()).toEqual(['/api/v1/reports']);
  });

  it('resolves accounts and dashboards once loaded; a deleted one stays hidden', async () => {
    const ids = [`account:${ACC}`, `dashboard:${DASH}`, 'dashboard:55555555-5555-5555-5555-555555555555'];
    const { result } = renderHook(() => useShortcuts(ids), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.items.map((s) => s.label)).toEqual(['HDFC Savings', 'Investments']);
    expect(fetched().sort()).toEqual(['/api/v1/accounts', '/api/v1/dashboards']);
  });

  it('the full catalog fetches every list', async () => {
    const { result } = renderHook(() => useShortcutCatalog(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.items.slice(-3).map((s) => s.label)).toEqual(['HDFC Savings', 'Monthly spend', 'Investments']);
  });
});
