import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CATEGORY_LIST_FIXTURE } from '@/lib/categoryList.fixtures';
import type { CategoryRule } from '@/lib/rules.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { DEFAULT_RULES_STATE } from './rulesModel';
import { RulesScreen, type RulesScreenProps } from './RulesScreen';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/transactions/rules',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));
const toasts = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({ ...(await orig<object>()), showToast: toasts.showToast }));
const http = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: http }));

const food = { key: 'food', name: 'Food', icon: 'cat-fork-knife' };
const groceries = { key: 'groceries', name: 'Groceries', icon: 'cat-shopping-cart' };
const categoryList = CATEGORY_LIST_FIXTURE;

const rule = (over: Partial<CategoryRule> = {}): CategoryRule => ({
  id: 'r1',
  merchantKey: 'DUNZO DAILY',
  matchType: 'CONTAINS',
  displayName: 'Dunzo',
  category: groceries,
  subcategory: { key: 'groceries.supermarket', name: 'Supermarket' },
  appliedCount: 4,
  lastAppliedAt: '2026-10-20T00:00:00Z',
  createdAt: '2026-10-01T00:00:00Z',
  mcc: '5814',
  ...over,
});
const swiggy = rule({ id: 'r2', merchantKey: 'SWIGGY', matchType: 'STARTS_WITH', displayName: 'Swiggy', appliedCount: 31, mcc: null, category: food, subcategory: { key: 'food.delivery', name: 'Delivery' } });
const rules = [rule(), swiggy];

const match = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  date: '2026-10-11',
  amount: 612,
  type: 'DEBIT',
  sourcedDescription: `DUNZO DAILY ${id}`,
  category: null,
  reviewType: null,
  appliedRuleId: null,
  appliedRuleName: null,
  accountId: 'a1',
  accountName: 'HDFC Regalia',
  accountBank: 'hdfc',
  cardId: 'k1',
  cardLast4: '7741',
  ...over,
});
const matchPage = (rows: ReturnType<typeof match>[], total = rows.length, totalPages = 1) => ({
  data: {
    matchCount: total,
    userSetCount: 0,
    matches: { content: rows, totalElements: total, totalPages, number: 0, size: 10 },
  },
});

function props(over: Partial<RulesScreenProps> = {}): RulesScreenProps {
  return {
    rules: { rows: rules, totalElements: 2, totalPages: 1 },
    state: DEFAULT_RULES_STATE,
    categoryList,
    ...over,
  };
}

describe('RulesScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    http.GET.mockImplementation((url: string) =>
      Promise.resolve({ data: url === '/api/v1/category-list' ? { categories: categoryList } : { content: [], totalElements: 0, totalPages: 0 } }),
    );
    http.POST.mockImplementation((url: string) => Promise.resolve(url === '/api/v1/rules/preview-matches' ? matchPage([]) : { data: {} }));
  });

  it('draws each rule as a card with its match, MCC and one category, and no last-used text', () => {
    renderWithQuery(<RulesScreen {...props()} />);
    expect(screen.getByText('Dunzo')).toBeTruthy();
    expect(screen.getByText('DUNZO DAILY')).toBeTruthy();
    expect(screen.getByText('MCC 5814')).toBeTruthy();
    expect(screen.getByText(/Starts with/)).toBeTruthy();
    expect(screen.getByText('Groceries · Supermarket')).toBeTruthy();
    expect(screen.getByText('Food · Delivery')).toBeTruthy();
    expect(screen.queryByText(/last (used|active)|used \d/i)).toBeNull();
  });

  it('has no verify, status or source UI: no Verified or Unverified word, no Approve, no checkboxes, no Source filter', () => {
    renderWithQuery(<RulesScreen {...props()} />);
    expect(screen.queryByText('Verified')).toBeNull();
    expect(screen.queryByText('Unverified')).toBeNull();
    expect(screen.queryByText('LLM-generated')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Source' })).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('the Tags tab replaces Rules and Categories', () => {
    renderWithQuery(<RulesScreen {...props()} />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['All', 'Tags', 'Import']);
  });

  it('the Category filter lists the fixed categories and writes the key to the address', () => {
    renderWithQuery(<RulesScreen {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Category' }));
    fireEvent.click(screen.getByRole('option', { name: 'Groceries' }));
    expect(router.push).toHaveBeenCalledWith('?category=groceries', { scroll: false });
  });

  it('a filter set shows a changed chip; Reset filters and the chip x put it back', () => {
    renderWithQuery(<RulesScreen {...props({ state: { ...DEFAULT_RULES_STATE, matchType: 'EXACT' } })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset filter' }));
    expect(router.push).toHaveBeenCalledWith('?', { scroll: false });
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it('a filter resets the page and keeps the rest of the address', () => {
    renderWithQuery(<RulesScreen {...props({ state: { ...DEFAULT_RULES_STATE, matchType: 'EXACT', page: 2 } })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Exact' }));
    fireEvent.click(screen.getByRole('option', { name: 'Regex' }));
    expect(router.push).toHaveBeenCalledWith('?match=REGEX', { scroll: false });
  });

  it('Reset filters keeps the search text', () => {
    renderWithQuery(<RulesScreen {...props({ state: { ...DEFAULT_RULES_STATE, q: 'dunzo', matchType: 'EXACT' } })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(router.push).toHaveBeenCalledWith(expect.stringContaining('q=dunzo'), { scroll: false });
    expect(router.push).toHaveBeenCalledWith(expect.not.stringContaining('match'), { scroll: false });
  });

  it('has no Usage or Sort filter', () => {
    renderWithQuery(<RulesScreen {...props()} />);
    expect(screen.queryByRole('button', { name: /usage|sort/i })).toBeNull();
  });

  it('pages with the Pager above and below', () => {
    renderWithQuery(<RulesScreen {...props({ rules: { rows: rules, totalElements: 64, totalPages: 3 } })} />);
    expect(screen.getAllByText(/64/).length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Page 2' })[0]);
    expect(router.push).toHaveBeenCalledWith('?page=2', { scroll: false });
  });

  it('says so when nothing matches, offering to clear the filters, and when the load failed', () => {
    const { unmount } = renderWithQuery(
      <RulesScreen {...props({ rules: { rows: [], totalElements: 0, totalPages: 0 }, state: { ...DEFAULT_RULES_STATE, q: 'zzz' } })} />,
    );
    expect(screen.getByText('No rules match')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.push).toHaveBeenCalledWith('?', { scroll: false });
    unmount();
    renderWithQuery(<RulesScreen {...props({ rules: null, reference: 'r-1' })} />);
    expect(screen.getByText("Couldn't load rules")).toBeTruthy();
  });

  it('an empty list for a user with no rules says No rules yet and what a rule does', () => {
    renderWithQuery(<RulesScreen {...props({ rules: { rows: [], totalElements: 0, totalPages: 0 } })} />);
    expect(screen.getByText('No rules yet')).toBeTruthy();
    expect(screen.getByText(/A rule sets the category of transactions/)).toBeTruthy();
  });

  it('Delete is in the menu and confirms first', async () => {
    http.DELETE.mockResolvedValue({});
    renderWithQuery(<RulesScreen {...props()} />);
    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Rule actions' })[0], { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    expect(await screen.findByText('Delete rule?')).toBeTruthy();
    expect(http.DELETE).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(http.DELETE).toHaveBeenCalledWith('/api/v1/rules/{id}', { params: { path: { id: 'r1' } } }));
    await waitFor(() => expect(toasts.showToast).toHaveBeenCalledWith('Rule deleted'));
  });

  it('the top bar + opens an empty Add rule form that saves with one category from the picker', async () => {
    renderWithQuery(<RulesScreen {...props()} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Add/ })[0]);
    expect(await screen.findByRole('dialog', { name: 'Add rule' })).toBeTruthy();
    expect((screen.getByLabelText('Pattern') as HTMLInputElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Add rule' }));
    expect(await screen.findByText('Pick a category.')).toBeTruthy();
    expect(http.POST).not.toHaveBeenCalledWith('/api/v1/rules', expect.anything());
    fireEvent.change(screen.getByLabelText('Pattern'), { target: { value: 'ZOMATO' } });
    fireEvent.click(screen.getByRole('combobox', { name: /Category/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Food' }));
    fireEvent.click(await screen.findByText('Delivery'));
    fireEvent.click(screen.getByRole('button', { name: 'Add rule' }));
    await waitFor(() =>
      expect(http.POST).toHaveBeenCalledWith('/api/v1/rules', {
        body: { merchantKey: 'ZOMATO', matchType: 'CONTAINS', displayName: undefined, categoryKey: 'food', subcategoryKey: 'food.delivery', mcc: undefined },
      }),
    );
  });

  it('Edit rule loads the matches on open with each account, and follows the pattern', async () => {
    http.POST.mockImplementation((url: string, init: { body: { merchantKey?: string } }) =>
      url === '/api/v1/rules/preview-matches'
        ? Promise.resolve(matchPage(init.body.merchantKey === 'DUNZO' ? [match('x1')] : [match('a1'), match('a2', { accountName: 'Paytm Wallet', accountBank: null, cardLast4: null })]))
        : Promise.resolve({ data: {} }),
    );
    renderWithQuery(<RulesScreen {...props()} />);
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Rule actions' })[0], { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    expect(await screen.findByText('Edit rule · Dunzo')).toBeTruthy();
    expect(screen.getByText(/Changing the pattern unlinks the 4 transactions/)).toBeTruthy();
    expect(await screen.findByText('Matches now · 2', {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.getByText(/HDFC Regalia ••7741/)).toBeTruthy();
    expect(screen.getByText(/Paytm Wallet/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Pattern'), { target: { value: 'DUNZO' } });
    expect(await screen.findByText('Matches now · 1', {}, { timeout: 3000 })).toBeTruthy();
  });

  it('Find matches opens with nothing ticked; Select all takes every page and applies to all', async () => {
    http.POST.mockImplementation((url: string) =>
      url === '/api/v1/rules/preview-matches'
        ? Promise.resolve(matchPage([match('m1'), match('m2')], 45, 3))
        : Promise.resolve({ data: { jobId: 'j1' } }),
    );
    renderWithQuery(<RulesScreen {...props()} />);
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Rule actions' })[0], { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Find matches' }));
    const dialog = await screen.findByRole('dialog');
    const all = await within(dialog).findByRole('checkbox', { name: /Select all 45 matches/ });
    expect(within(dialog).getAllByRole('checkbox').filter((c) => c.getAttribute('aria-checked') === 'true')).toHaveLength(0);
    expect((within(dialog).getByRole('button', { name: 'Apply rule' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(all);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply rule (45)' }));
    await waitFor(() =>
      expect(http.POST).toHaveBeenCalledWith('/api/v1/rules/{id}/apply', { params: { path: { id: 'r1' } }, body: { all: true } }),
    );
  });

  it('Find matches applies to just the ticked rows', async () => {
    http.POST.mockImplementation((url: string) =>
      url === '/api/v1/rules/preview-matches' ? Promise.resolve(matchPage([match('m1'), match('m2')])) : Promise.resolve({ data: { jobId: 'j1' } }),
    );
    renderWithQuery(<RulesScreen {...props()} />);
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Rule actions' })[0], { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Find matches' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(await within(dialog).findByRole('checkbox', { name: 'DUNZO DAILY m2' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply rule (1)' }));
    await waitFor(() =>
      expect(http.POST).toHaveBeenCalledWith('/api/v1/rules/{id}/apply', { params: { path: { id: 'r1' } }, body: { transactionIds: ['m2'] } }),
    );
  });
  it('Edit saves the changes as one update, and a bad pattern or MCC blocks it with a message', async () => {
    http.PUT.mockResolvedValue({ data: {} });
    renderWithQuery(<RulesScreen {...props()} />);
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Rule actions' })[0], { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    await screen.findByText('Edit rule · Dunzo');
    fireEvent.change(screen.getByLabelText('Pattern'), { target: { value: 'ab' } });
    fireEvent.change(screen.getByLabelText(/MCC code/), { target: { value: '58' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' }));
    expect(await screen.findByText('Pattern must be at least 3 characters.')).toBeTruthy();
    expect(screen.getByText('MCC code must be exactly 4 digits, or left empty.')).toBeTruthy();
    expect(http.PUT).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Pattern'), { target: { value: 'DUNZO NOW' } });
    fireEvent.change(screen.getByLabelText(/MCC code/), { target: { value: '5812' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' }));
    await waitFor(() =>
      expect(http.PUT).toHaveBeenCalledWith('/api/v1/rules/{id}', {
        params: { path: { id: 'r1' } },
        body: { merchantKey: 'DUNZO NOW', matchType: 'CONTAINS', displayName: 'Dunzo', categoryKey: 'groceries', subcategoryKey: 'groceries.supermarket', mcc: '5812' },
      }),
    );
    await waitFor(() => expect(toasts.showToast).toHaveBeenCalledWith('Rule updated'));
  });

  it('lists the recent rule jobs under the rules', async () => {
    http.GET.mockImplementation((url: string) =>
      Promise.resolve({
        data:
          url === '/api/v1/jobs'
            ? {
                content: [{ id: 'j1', type: 'RULE_APPLY', status: 'SUCCEEDED', createdAt: '2026-10-20T10:00:00Z', result: { appliedCount: 3 } }],
                totalElements: 1,
                totalPages: 1,
              }
            : { categories: categoryList },
      }),
    );
    renderWithQuery(<RulesScreen {...props()} />);
    expect(screen.getByText('Recent rule jobs')).toBeTruthy();
    await waitFor(() => expect(http.GET).toHaveBeenCalledWith('/api/v1/jobs', expect.objectContaining({ params: { query: expect.objectContaining({ type: 'RULE_APPLY' }) } })));
  });
  it('a failed matches request says so and Try again asks again', async () => {
    let calls = 0;
    http.POST.mockImplementation((url: string) => {
      if (url !== '/api/v1/rules/preview-matches') return Promise.resolve({ data: {} });
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('boom')) : Promise.resolve(matchPage([match('a1')]));
    });
    renderWithQuery(<RulesScreen {...props()} />);
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Rule actions' })[0], { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Find matches' }));
    expect(await screen.findByText("Couldn't load matches", {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByText('No transactions match this rule.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/Select all 1 match/)).toBeTruthy();
  });

  it('while a changed pattern loads, the old matches give way to the loading title', async () => {
    let release: (v: unknown) => void = () => undefined;
    http.POST.mockImplementation((url: string, init: { body: { merchantKey?: string } }) => {
      if (url !== '/api/v1/rules/preview-matches') return Promise.resolve({ data: {} });
      return init.body.merchantKey === 'DUNZO DAILY' ? Promise.resolve(matchPage([match('a1')])) : new Promise((r) => (release = r));
    });
    renderWithQuery(<RulesScreen {...props()} />);
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Rule actions' })[0], { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    expect(await screen.findByText('Matches now · 1')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Pattern'), { target: { value: 'DUNZO NEW' } });
    expect(await screen.findByText('Finding matches…', {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.queryByText('Matches now · 1')).toBeNull();
    release(matchPage([match('b1'), match('b2')]));
    expect(await screen.findByText('Matches now · 2', {}, { timeout: 3000 })).toBeTruthy();
  });
});
