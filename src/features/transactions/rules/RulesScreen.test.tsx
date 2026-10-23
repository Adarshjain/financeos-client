import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CategoryRule } from '@/lib/rules.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { DEFAULT_RULES_STATE } from './rulesModel';
import { RulesScreen, type RulesScreenProps } from './RulesScreen';

const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/ds/transactions/rules',
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
vi.mock('@/lib/api/client', async (orig) => ({ ...(await orig<object>()), api: http }));

const food = { id: 'c1', name: 'Food & dining' };
const groceries = { id: 'c2', name: 'Groceries' };
const categories = [food, groceries];

const rule = (over: Partial<CategoryRule> = {}): CategoryRule => ({
  id: 'r1',
  merchantKey: 'DUNZO DAILY',
  matchType: 'CONTAINS',
  displayName: 'Dunzo',
  categories: [groceries],
  verified: false,
  source: 'LLM',
  appliedCount: 4,
  lastAppliedAt: '2026-10-20T00:00:00Z',
  createdAt: '2026-10-01T00:00:00Z',
  mcc: '5814',
  ...over,
});
const swiggy = rule({ id: 'r2', merchantKey: 'SWIGGY', matchType: 'STARTS_WITH', displayName: 'Swiggy', verified: true, source: 'USER', appliedCount: 31, mcc: null, categories: [food] });
const rules = [rule(), swiggy];

const match = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  date: '2026-10-11',
  amount: 612,
  type: 'DEBIT',
  sourcedDescription: `DUNZO DAILY ${id}`,
  categories: [],
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
  data: { content: rows, totalElements: total, totalPages, number: 0, size: 10 },
});

function props(over: Partial<RulesScreenProps> = {}): RulesScreenProps {
  return {
    rules: { rows: rules, totalElements: 2, totalPages: 1 },
    state: DEFAULT_RULES_STATE,
    counts: { unverified: 3, verified: 61, all: 64 },
    categories,
    ...over,
  };
}

function stubLayout(phone: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({ matches: !phone && query.includes('min-width'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

describe('RulesScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    http.GET.mockImplementation((url: string) =>
      Promise.resolve({ data: url === '/api/v1/categories' ? categories : { content: [], totalElements: 0, totalPages: 0 } }),
    );
    http.POST.mockImplementation((url: string) => Promise.resolve(url === '/api/v1/rules/preview-matches' ? matchPage([]) : { data: {} }));
  });

  it('draws each rule as a card with its match, source, MCC and categories, and no last-used text', () => {
    renderWithQuery(<RulesScreen {...props()} />);
    expect(screen.getByText('Dunzo')).toBeTruthy();
    expect(screen.getByText('DUNZO DAILY')).toBeTruthy();
    expect(screen.getByText('LLM-generated')).toBeTruthy();
    expect(screen.getByText('MCC 5814')).toBeTruthy();
    expect(screen.getByText('Created by you')).toBeTruthy();
    expect(screen.getByText(/Starts with/)).toBeTruthy();
    expect(screen.queryByText(/last (used|active)|used \d/i)).toBeNull();
    // Approve only on the unverified rule.
    expect(screen.getAllByRole('button', { name: 'Approve' })).toHaveLength(1);
  });

  it('shows the three status counts and writes the status to the address', () => {
    renderWithQuery(<RulesScreen {...props()} />);
    expect(screen.getByRole('button', { name: 'All · 64' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Unverified · 3' }));
    expect(router.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Verified · 61' }));
    expect(router.push).toHaveBeenCalledWith('?status=verified', { scroll: false });
  });

  it('a filter resets the page and keeps the rest of the address', () => {
    renderWithQuery(<RulesScreen {...props({ state: { ...DEFAULT_RULES_STATE, status: 'all', page: 2 } })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Source' }));
    fireEvent.click(screen.getByRole('option', { name: 'Created by you' }));
    expect(router.push).toHaveBeenCalledWith('?status=all&source=USER', { scroll: false });
  });

  it('has no Usage or Sort filter', () => {
    renderWithQuery(<RulesScreen {...props()} />);
    expect(screen.queryByRole('button', { name: /usage|sort/i })).toBeNull();
  });

  it('pages with the Pager above and below', () => {
    renderWithQuery(<RulesScreen {...props({ rules: { rows: rules, totalElements: 64, totalPages: 3 } })} />);
    expect(screen.getAllByText(/64/).length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Page 2' })[0]);
    expect(router.push).toHaveBeenCalledWith('?page=1', { scroll: false });
  });

  it('says so when nothing matches, offering to clear the filters, and when the load failed', () => {
    const { unmount } = renderWithQuery(
      <RulesScreen {...props({ rules: { rows: [], totalElements: 0, totalPages: 0 }, state: { ...DEFAULT_RULES_STATE, q: 'zzz' } })} />,
    );
    expect(screen.getByText('No rules found')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.push).toHaveBeenCalledWith('?', { scroll: false });
    unmount();
    renderWithQuery(<RulesScreen {...props({ rules: null, reference: 'r-1' })} />);
    expect(screen.getByText('Could not load rules')).toBeTruthy();
  });

  it('Approve verifies that rule', async () => {
    renderWithQuery(<RulesScreen {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(http.POST).toHaveBeenCalledWith('/api/v1/rules/{id}/verify', { params: { path: { id: 'r1' } } }));
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });

  it('Delete is in the menu and confirms first', async () => {
    http.DELETE.mockResolvedValue({});
    renderWithQuery(<RulesScreen {...props()} />);
    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Rule actions' })[0], { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete rule' }));
    expect(await screen.findByText('Delete rule?')).toBeTruthy();
    expect(http.DELETE).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete rule' }));
    await waitFor(() => expect(http.DELETE).toHaveBeenCalledWith('/api/v1/rules/{id}', { params: { path: { id: 'r1' } } }));
    await waitFor(() => expect(toasts.showToast).toHaveBeenCalledWith('Rule deleted'));
  });

  it('desktop: ticking unverified rules docks Approve, which verifies them together', async () => {
    stubLayout(false);
    http.POST.mockResolvedValue({ data: { verifiedCount: 1 } });
    renderWithQuery(<RulesScreen {...props()} />);
    // Only the unverified rule has a checkbox.
    expect(screen.queryByLabelText('Select Swiggy')).toBeNull();
    fireEvent.click(screen.getByLabelText('Select Dunzo'));
    expect(await screen.findByText('1 selected')).toBeTruthy();
    fireEvent.click(within(document.querySelector('[data-selection-bar]') as HTMLElement).getByRole('button', { name: /^Approve/ }));
    await waitFor(() => expect(http.POST).toHaveBeenCalledWith('/api/v1/rules/verify', { body: { ruleIds: ['r1'] } }));
  });

  it('the top bar + opens an empty Add rule form that saves with its categories', async () => {
    renderWithQuery(<RulesScreen {...props()} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Add/ })[0]);
    expect(await screen.findByText('Add rule')).toBeTruthy();
    expect((screen.getByLabelText('Pattern') as HTMLInputElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Pick at least one category.')).toBeTruthy();
    expect(http.POST).not.toHaveBeenCalledWith('/api/v1/rules', expect.anything());
    fireEvent.change(screen.getByLabelText('Pattern'), { target: { value: 'ZOMATO' } });
    fireEvent.click(screen.getByRole('combobox', { name: /Categories/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Food & dining' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(http.POST).toHaveBeenCalledWith('/api/v1/rules', {
        body: { merchantKey: 'ZOMATO', matchType: 'MERCHANT_KEY', displayName: undefined, categoryIds: ['c1'], mcc: undefined },
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
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit rule' }));
    expect(await screen.findByText('Edit rule · Dunzo')).toBeTruthy();
    expect(screen.getByText(/Changing the pattern unlinks the 4 transactions/)).toBeTruthy();
    expect(await screen.findByText('Matches now · 2')).toBeTruthy();
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
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit rule' }));
    await screen.findByText('Edit rule · Dunzo');
    fireEvent.change(screen.getByLabelText('Pattern'), { target: { value: 'ab' } });
    fireEvent.change(screen.getByLabelText(/MCC code/), { target: { value: '58' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Pattern must be at least 3 characters.')).toBeTruthy();
    expect(screen.getByText('MCC code must be exactly 4 digits, or left empty.')).toBeTruthy();
    expect(http.PUT).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Pattern'), { target: { value: 'DUNZO NOW' } });
    fireEvent.change(screen.getByLabelText(/MCC code/), { target: { value: '5812' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(http.PUT).toHaveBeenCalledWith('/api/v1/rules/{id}', {
        params: { path: { id: 'r1' } },
        body: { merchantKey: 'DUNZO NOW', matchType: 'CONTAINS', displayName: 'Dunzo', categoryIds: ['c2'], mcc: '5812' },
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
            : categories,
      }),
    );
    renderWithQuery(<RulesScreen {...props()} />);
    expect(screen.getByText('Recent rule jobs')).toBeTruthy();
    await waitFor(() => expect(http.GET).toHaveBeenCalledWith('/api/v1/jobs', expect.objectContaining({ params: { query: expect.objectContaining({ type: 'RULE_APPLY' }) } })));
  });
  it('deleting a ticked rule takes it out of the selection, so Approve sends only the others', async () => {
    stubLayout(false);
    http.DELETE.mockResolvedValue({});
    http.POST.mockImplementation((url: string) => Promise.resolve(url === '/api/v1/rules/verify' ? { data: { verifiedCount: 1 } } : { data: {} }));
    const second = rule({ id: 'r3', displayName: 'Lenskart', merchantKey: 'LENSKART' });
    renderWithQuery(<RulesScreen {...props({ rules: { rows: [rule(), second], totalElements: 2, totalPages: 1 } })} />);
    fireEvent.click(screen.getByLabelText('Select Dunzo'));
    fireEvent.click(screen.getByLabelText('Select Lenskart'));
    expect(await screen.findByText('2 selected')).toBeTruthy();
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Rule actions' })[0], { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete rule' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete rule' }));
    expect(await screen.findByText('1 selected')).toBeTruthy();
    fireEvent.click(within(document.querySelector('[data-selection-bar]') as HTMLElement).getByRole('button', { name: /^Approve/ }));
    await waitFor(() => expect(http.POST).toHaveBeenCalledWith('/api/v1/rules/verify', { body: { ruleIds: ['r3'] } }));
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
    expect(await screen.findByText('Could not load matches', {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByText('No transactions match this rule.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
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
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit rule' }));
    expect(await screen.findByText('Matches now · 1')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Pattern'), { target: { value: 'DUNZO NEW' } });
    expect(await screen.findByText('Finding matches…', {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.queryByText('Matches now · 1')).toBeNull();
    release(matchPage([match('b1'), match('b2')]));
    expect(await screen.findByText('Matches now · 2')).toBeTruthy();
  });
});
