import { screen, waitFor } from '@testing-library/react';
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

import { renderWithQuery } from '@/test/renderWithQuery';

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
  mocks.undo.mockResolvedValue(ok({ restored: 3, skipped: 0, ruleDeleted: false, ruleRestored: false }));
});

const setup = () => {
  const onClose = vi.fn();
  renderWithQuery(<SortThemDialog onClose={onClose} />);
  return { onClose, user: userEvent.setup({ pointerEventsCheck: 0 }) };
};

describe('SortThemDialog', () => {
  it('lists the groups with their lines and the one-offs last', async () => {
    setup();
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getByText('23 need a category')).toBeInTheDocument();
    expect(screen.getByText('Person · 3 payments · ₹9,000')).toBeInTheDocument();
    expect(screen.getByText('4 transactions · ₹2,140')).toBeInTheDocument();
    const oneOffs = screen.getByText('One-offs');
    expect(oneOffs.compareDocumentPosition(screen.getByText('PAI ELECTRICALS')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('28 Oct · ₹740')).toBeInTheDocument();
    // The groups page counts groups and one-offs together: 3 items less the 2 groups of two or more.
    expect(oneOffs.parentElement).toHaveTextContent(/One-offs\s*1/i);
    expect(screen.queryByRole('button', { name: /^Save/ })).toBeNull();
  });

  it('reads the summary when it opens, and shows loading rows and the neutral title until it arrives', async () => {
    mocks.summary.mockReturnValue(new Promise(() => undefined));
    setup();
    expect(mocks.summary).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Some transactions need a category')).toBeInTheDocument();
    await waitFor(() => expect(mocks.groups).toHaveBeenCalled());
    expect(screen.queryByText('Ravi Kumar')).toBeNull();
  });

  it('counts the one-offs from the whole list, not the page: total less the groups of two or more', async () => {
    mocks.groups.mockResolvedValue(ok({ content: [PAI], totalElements: 33, totalPages: 2, size: 25, number: 0 }));
    setup();
    await screen.findByText('PAI ELECTRICALS');
    expect(screen.getByText('One-offs').parentElement).toHaveTextContent(/One-offs\s*31/i);
  });

  it('opens a shop: Category field, every transaction ticked, rule on, Set for stays off until a category is picked', async () => {
    const { user } = setup();
    await user.click(await screen.findByText('Sharma Medicals'));
    expect(await screen.findByText('Applies to')).toBeInTheDocument();
    expect(await screen.findAllByRole('checkbox', { name: /Include SHARMA MEDICALS/ })).toHaveLength(4);
    for (const box of screen.getAllByRole('checkbox', { name: /Include/ })) expect(box).toBeChecked();
    expect(screen.getByText('Adds a rule: Contains "SHARMA MEDICALS"')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Do the same next time' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Set for 4' })).toBeDisabled();
  });

  it('opens a person: reasons first, rule off by default', async () => {
    const { user } = setup();
    await user.click(await screen.findByText('Ravi Kumar'));
    expect(await screen.findByText('Why did you pay Ravi?')).toBeInTheDocument();
    for (const label of ['Lent', 'Gifts', 'Family', 'Bills · House help', 'Bills · Rent', 'Repaid', 'Something else…']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('switch', { name: 'Do the same next time' })).not.toBeChecked();
  });

  it('sets a reason at once: applies the ticked transactions with no rule, closes the group, and the toast offers Undo', async () => {
    const { user, onClose } = setup();
    await user.click(await screen.findByText('Ravi Kumar'));
    await screen.findAllByRole('checkbox', { name: /Include/ });
    await user.click(screen.getAllByRole('checkbox', { name: /Include RAVI KUMAR/ })[0]);
    await user.click(screen.getByRole('button', { name: 'Lent' }));
    await user.click(screen.getByRole('button', { name: 'Set for 2' }));
    await waitFor(() => expect(mocks.apply).toHaveBeenCalledTimes(1));
    expect(mocks.apply).toHaveBeenCalledWith({
      transactionIds: ['r2', 'r3'],
      categoryKey: 'lent',
      subcategoryKey: null,
      rule: undefined,
    });
    await waitFor(() => expect(screen.queryByText('Why did you pay Ravi?')).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('Set the category of 3 transactions', expect.objectContaining({ action: expect.objectContaining({ label: 'Undo' }) }));
    expect(screen.queryByRole('button', { name: /^Save/ })).toBeNull();
  });

  it('Undo in the toast sends what the apply returned and refreshes', async () => {
    mocks.apply.mockResolvedValue(ok({ updated: 4, skipped: 0, ruleId: 'rule-1', ruleCreated: true, previousRuleCategoryKey: 'food', previousRuleSubcategoryKey: null, updatedIds: ['s1', 's2', 's3', 's4'], userClearedIds: ['s2'], ruleMerchantKey: 'sharma', ruleMatchType: 'CONTAINS' }));
    const { user } = setup();
    await user.click(await screen.findByText('Sharma Medicals'));
    await screen.findAllByRole('checkbox', { name: /Include/ });
    await user.click(screen.getByText('Pick a category'));
    await user.click(await screen.findByRole('button', { name: 'Health' }));
    await user.click(await screen.findByText('Medicines'));
    await user.click(await screen.findByRole('button', { name: 'Set for 4' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
    mocks.refresh.mockClear();
    const options = mocks.toast.mock.calls[0]![1] as { action: { onSelect: () => void } };
    options.action.onSelect();
    await waitFor(() => expect(mocks.undo).toHaveBeenCalledTimes(1));
    expect(mocks.undo).toHaveBeenCalledWith({
      transactionIds: ['s1', 's2', 's3', 's4'],
      categoryKey: 'health',
      subcategoryKey: 'health.medicines',
      ruleId: 'rule-1',
      ruleCreated: true,
      previousRuleCategoryKey: 'food',
      previousRuleSubcategoryKey: null,
      userClearedIds: ['s2'],
      ruleMerchantKey: 'sharma',
      ruleMatchType: 'CONTAINS',
    });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Put 3 transactions back'));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('a failed Undo says so', async () => {
    mocks.undo.mockResolvedValue({ success: false, error: { message: 'Too late', code: 'X' } });
    const { user } = setup();
    await user.click(await screen.findByText('Ravi Kumar'));
    await user.click(await screen.findByRole('button', { name: 'Lent' }));
    await user.click(await screen.findByRole('button', { name: 'Set for 3' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
    (mocks.toast.mock.calls[0]![1] as { action: { onSelect: () => void } }).action.onSelect();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Too late', { tone: 'danger' }));
  });

  it('a shop with the rule switch on sends the rule, uppercase, Contains', async () => {
    const { user } = setup();
    await user.click(await screen.findByText('Sharma Medicals'));
    await screen.findAllByRole('checkbox', { name: /Include/ });
    await user.click(screen.getByText('Pick a category'));
    await user.click(await screen.findByRole('button', { name: 'Health' }));
    await user.click(await screen.findByText('Medicines'));
    await user.click(await screen.findByRole('button', { name: 'Set for 4' }));
    await waitFor(() => expect(mocks.apply).toHaveBeenCalled());
    expect(mocks.apply).toHaveBeenCalledWith({
      transactionIds: ['s1', 's2', 's3', 's4'],
      categoryKey: 'health',
      subcategoryKey: 'health.medicines',
      rule: { pattern: 'SHARMA MEDICALS', matchType: 'CONTAINS' },
    });
  });

  it('Done closes without applying anything', async () => {
    const { user, onClose } = setup();
    await screen.findByText('Ravi Kumar');
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalled();
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('pages through every transaction of a group when saving', async () => {
    mocks.transactions.mockImplementation(async (key: string, pageNo: number) => {
      if (key !== 'ravi') return ok(page(SHARMA_TXNS));
      return ok({ content: [txn(`r${pageNo}`, -1)], totalElements: 2, totalPages: 2, size: 200, number: pageNo });
    });
    const { user } = setup();
    await user.click(await screen.findByText('Ravi Kumar'));
    await user.click(await screen.findByRole('button', { name: 'Gifts' }));
    await user.click(await screen.findByRole('button', { name: 'Set for 3' }));
    await waitFor(() => expect(mocks.apply).toHaveBeenCalled());
    expect(mocks.apply.mock.calls[0]![0].transactionIds).toEqual(['r0', 'r1']);
  });

  it('search sends the trimmed text after a pause, starts on the first page, and clears back to everything', async () => {
    const { user } = setup();
    await screen.findByText('Ravi Kumar');
    mocks.groups.mockResolvedValue(ok(page([SHARMA])));
    await user.type(screen.getByRole('searchbox', { name: 'Search groups' }), ' sharma ');
    await waitFor(() => expect(mocks.groups).toHaveBeenLastCalledWith(0, 10, 'sharma'));
    await waitFor(() => expect(screen.queryByText('Ravi Kumar')).toBeNull());
    expect(screen.getByText('Sharma Medicals')).toBeInTheDocument();
    mocks.groups.mockResolvedValue(ok(page([RAVI, SHARMA, PAI])));
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    await waitFor(() => expect(mocks.groups).toHaveBeenLastCalledWith(0, 10));
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
  });

  it('says no groups match when the search finds none', async () => {
    const { user } = setup();
    await screen.findByText('Ravi Kumar');
    mocks.groups.mockResolvedValue(ok({ content: [], totalElements: 0, totalPages: 0, size: 10, number: 0 }));
    await user.type(screen.getByRole('searchbox', { name: 'Search groups' }), 'zzz');
    expect(await screen.findByText('No groups match')).toBeInTheDocument();
    expect(screen.getByText('No group has "zzz" in its name.')).toBeInTheDocument();
  });
});
