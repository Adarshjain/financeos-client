import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  summary: vi.fn(),
  groups: vi.fn(),
  transactions: vi.fn(),
  apply: vi.fn(),
  recent: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh, push: vi.fn() }) }));
vi.mock('@/components/ds/Toast/Toast', () => ({ showToast: mocks.toast }));
vi.mock('@/lib/query/actions/categoryListActions', async () => {
  const { CATEGORY_LIST_FIXTURE } = await import('@/lib/categoryList.fixtures');
  return { loadCategoryList: vi.fn(async () => ({ success: true, data: CATEGORY_LIST_FIXTURE })) };
});
vi.mock('@/lib/query/actions/uncategorizedActions', () => ({
  loadUncategorizedSummary: mocks.summary,
  loadUncategorizedGroups: mocks.groups,
  loadGroupTransactions: mocks.transactions,
  applyUncategorized: mocks.apply,
  loadCategoryRecent: mocks.recent,
}));

import { createTestQueryClient, renderWithQuery } from '@/test/renderWithQuery';

import { SortThemDialog } from './SortThemDialog';

const ok = <T,>(data: T) => ({ success: true, data });
const page = <T,>(content: T[], totalPages = 1) => ({ content, totalElements: content.length, totalPages, size: 25, number: 0 });

const SHARMA = { groupKey: 'sharma', label: 'Sharma Medicals', person: false, direction: 'OUT', count: 4, total: -2140, firstDate: '2026-09-21', lastDate: '2026-10-29', oneOff: false };
const RAVI = { groupKey: 'ravi', label: 'Ravi Kumar', person: true, direction: 'OUT', count: 3, total: -9000, firstDate: '2026-09-01', lastDate: '2026-11-01', oneOff: false };
const PAI = { groupKey: 'pai', label: 'PAI ELECTRICALS', person: false, direction: 'OUT', count: 1, total: -740, firstDate: '2026-10-28', lastDate: '2026-10-28', oneOff: true };

const txn = (id: string, amount: number, description = 'SHARMA MEDICALS') => ({
  id, date: '2026-10-29', description, accountId: 'a', accountName: 'HDFC Regalia', cardLast4: '7741', source: 'gmail_transaction_alert', amount, type: 'DEBIT',
});
const SHARMA_TXNS = [txn('s1', -820), txn('s2', -460), txn('s3', -600), txn('s4', -260)];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.summary.mockResolvedValue(ok({ count: 23, groupCount: 2, topGroups: [] }));
  mocks.groups.mockResolvedValue(ok(page([RAVI, SHARMA, PAI])));
  mocks.transactions.mockImplementation(async (key: string) =>
    ok(page(key === 'sharma' ? SHARMA_TXNS : [txn('r1', -3000, 'RAVI KUMAR'), txn('r2', -3000, 'RAVI KUMAR'), txn('r3', -3000, 'RAVI KUMAR')])),
  );
  mocks.recent.mockResolvedValue(ok([]));
  mocks.apply.mockResolvedValue(ok({ updated: 3, skipped: 0, ruleId: null }));
});


const setup = (queryClient = createTestQueryClient()) => {
  const onClose = vi.fn();
  const view = renderWithQuery(<SortThemDialog onClose={onClose} />, { queryClient });
  return { onClose, view, user: userEvent.setup({ pointerEventsCheck: 0 }) };
};

/** Stages "Lent" for Ravi (3 payments) and presses Save; the apply request is left pending until `finish` is called. */
async function stageRaviAndSave() {
  const ctx = setup();
  await ctx.user.click(await screen.findByText('Ravi Kumar'));
  await ctx.user.click(await screen.findByRole('button', { name: 'Lent' }));
  await ctx.user.click(await screen.findByRole('button', { name: 'Set for 3' }));
  await ctx.user.click(await screen.findByRole('button', { name: 'Save 1 group' }));
  return ctx;
}

describe('SortThemDialog while Save runs', () => {
  it('locks Later, the close ×, Escape and the rows until the save answers, then closes', async () => {
    let finish!: (v: unknown) => void;
    mocks.apply.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { onClose, user } = await stageRaviAndSave();
    await waitFor(() => expect(mocks.apply).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Later' })).toBeDisabled();
    const dialog = screen.getByRole('button', { name: 'Later' }).closest('[role="dialog"]') as HTMLElement;
    const closers = within(dialog).queryAllByRole('button', { name: 'Close' });
    // The drawn × is gone; the screen-reader-only close that a drag-down or the backdrop presses is guarded.
    expect(closers.filter((b) => !b.classList.contains('sr-only'))).toHaveLength(0);
    closers.forEach((b) => b.click());
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector('[inert]')).not.toBeNull();
    finish(ok({ updated: 3, skipped: 0, ruleId: null }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('a group that failed stays staged and visible with its pick, and the dialog stays open and unlocked', async () => {
    mocks.apply.mockResolvedValue({ success: false, error: { message: 'Server said no', code: 'X' } });
    const { onClose } = await stageRaviAndSave();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Server said no', { tone: 'danger' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Save 1 group' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Later' })).toBeEnabled();
    expect(screen.getByText('Ravi Kumar').closest('[role="button"]')).toHaveTextContent('Lent');
    expect(document.querySelector('[inert]')).toBeNull();
  });

  it('does nothing to a gone dialog when the save answers after it unmounted', async () => {
    let finish!: (v: unknown) => void;
    mocks.apply.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { onClose, view } = await stageRaviAndSave();
    await waitFor(() => expect(mocks.apply).toHaveBeenCalled());
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    view.unmount();
    finish(ok({ updated: 3, skipped: 0, ruleId: null }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Set the category of 3 transactions'));
    expect(onClose).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});

describe('SortThemDialog freshness', () => {
  it('reads the summary and the groups again every time it opens, even with a warm cache', async () => {
    const client = createTestQueryClient();
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity, staleTime: 60_000 } });
    const first = setup(client);
    await screen.findByText('23 need a category');
    first.view.unmount();
    cleanup();
    mocks.summary.mockResolvedValue(ok({ count: 5, groupCount: 2, topGroups: [] }));
    mocks.groups.mockResolvedValue(ok(page([RAVI, SHARMA])));
    setup(client);
    expect(await screen.findByText('5 need a category')).toBeInTheDocument();
    expect(mocks.summary).toHaveBeenCalledTimes(2);
    expect(mocks.groups).toHaveBeenCalledTimes(2);
  });

  it('a group opened again reads its transactions again', async () => {
    const client = createTestQueryClient();
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity, staleTime: 60_000 } });
    const { user } = setup(client);
    await user.click(await screen.findByText('Sharma Medicals'));
    await screen.findAllByRole('checkbox', { name: /Include/ });
    await user.keyboard('{Escape}');
    await user.click(await screen.findByText('Sharma Medicals'));
    await screen.findAllByRole('checkbox', { name: /Include/ });
    await waitFor(() => expect(mocks.transactions.mock.calls.filter((c) => c[0] === 'sharma')).toHaveLength(2));
  });
});
