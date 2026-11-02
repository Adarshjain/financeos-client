import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  summary: vi.fn(),
  groups: vi.fn(),
  transactions: vi.fn(),
  apply: vi.fn(),
  undo: vi.fn(),
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
  undoUncategorized: mocks.undo,
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
  mocks.apply.mockResolvedValue(ok({ updated: 3, skipped: 0, ruleCreated: false, previousRuleCategoryKey: null, previousRuleSubcategoryKey: null, updatedIds: ['r1', 'r2', 'r3'], userClearedIds: [], ruleMerchantKey: null, ruleMatchType: null }));
});


const setup = (queryClient = createTestQueryClient()) => {
  const onClose = vi.fn();
  const view = renderWithQuery(<SortThemDialog onClose={onClose} />, { queryClient });
  return { onClose, view, user: userEvent.setup({ pointerEventsCheck: 0 }) };
};

/** Picks "Lent" for Ravi (3 payments) and presses Set for 3; the apply request is left pending until `finish` is called. */
async function setRavi() {
  const ctx = setup();
  await ctx.user.click(await screen.findByText('Ravi Kumar'));
  await ctx.user.click(await screen.findByRole('button', { name: 'Lent' }));
  await ctx.user.click(await screen.findByRole('button', { name: 'Set for 3' }));
  return ctx;
}

const APPLIED = ok({ updated: 3, skipped: 0, ruleCreated: false, previousRuleCategoryKey: null, previousRuleSubcategoryKey: null, updatedIds: ['r1', 'r2', 'r3'], userClearedIds: [], ruleMerchantKey: null, ruleMatchType: null });

describe('SortThemDialog while a group is being set', () => {
  it('locks Later, the close ×, Escape and the rows until the apply answers, then closes only the group', async () => {
    let finish!: (v: unknown) => void;
    mocks.apply.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { onClose, user } = await setRavi();
    await waitFor(() => expect(mocks.apply).toHaveBeenCalled());
    const later = screen.getByRole('button', { name: 'Later', hidden: true });
    expect(later).toBeDisabled();
    const dialog = later.closest('[role="dialog"]') as HTMLElement;
    const closers = within(dialog).queryAllByRole('button', { name: 'Close' });
    // The drawn × is gone; the screen-reader-only close that a drag-down or the backdrop presses is guarded.
    expect(closers.filter((b) => !b.classList.contains('sr-only'))).toHaveLength(0);
    closers.forEach((b) => b.click());
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Why did you pay Ravi?')).toBeInTheDocument();
    finish(APPLIED);
    await waitFor(() => expect(screen.queryByText('Why did you pay Ravi?')).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Later' })).toBeEnabled();
    expect(document.querySelector('[inert]')).toBeNull();
  });

  it('a group that failed says what failed, stays open with its pick, and nothing stays locked', async () => {
    mocks.apply.mockResolvedValue({ success: false, error: { message: 'Server said no', code: 'X' } });
    const { onClose } = await setRavi();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Server said no', { tone: 'danger' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Set for 3' })).toBeEnabled();
    expect(screen.getByText('Why did you pay Ravi?')).toBeInTheDocument();
    expect(document.querySelector('[inert]')).toBeNull();
  });

  it('does nothing to a gone dialog when the apply answers after it unmounted', async () => {
    let finish!: (v: unknown) => void;
    mocks.apply.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { onClose, view } = await setRavi();
    await waitFor(() => expect(mocks.apply).toHaveBeenCalled());
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    view.unmount();
    finish(APPLIED);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Set the category of 3 transactions', expect.anything()));
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
