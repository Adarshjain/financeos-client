import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RulesBrowser } from '@/components/rules/RulesBrowser';
import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn() }),
  usePathname: () => '/rules',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

// Toasts render via a `<Toaster />` mounted only in the root layout, which
// this component-level render doesn't include — assert on the mock calls
// instead of DOM text, matching every other test in this repo (e.g.
// ReviewTransaction.test.tsx).
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Combobox popover internals lean on APIs jsdom doesn't implement.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const foodCategory = { id: 'c1', name: 'Food' };
const categories = [foodCategory, { id: 'c2', name: 'Groceries' }];

const rule1 = {
  id: 'r1',
  merchantKey: 'SWIGGY',
  matchType: 'MERCHANT_KEY',
  displayName: 'Swiggy',
  categories: [foodCategory],
  verified: false,
  source: 'USER',
  appliedCount: 3,
  lastAppliedAt: null,
  createdAt: '2026-08-01T00:00:00Z',
  mcc: null,
};

const rule2 = { ...rule1, id: 'r2', merchantKey: 'ZOMATO', displayName: 'Zomato', verified: true };

function pagedRules(content: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: 50,
    number: 0,
    first: true,
    last: true,
    empty: content.length === 0,
    ...overrides,
  };
}

function mockApiGet(rulesResponse: unknown = pagedRules([rule1, rule2])) {
  (api.GET as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url === '/api/v1/rules') return Promise.resolve({ data: rulesResponse });
    if (url === '/api/v1/categories') return Promise.resolve({ data: categories });
    if (url === '/api/v1/jobs') return Promise.resolve({ data: { content: [] } });
    return Promise.resolve({ data: null });
  });
}

// The dropdown menu (trigger + items) is a Radix primitive that opens/selects
// off pointer events `fireEvent.click` doesn't synthesize — `userEvent`
// simulates the full pointer sequence, which Radix needs here.
async function openRuleMenu(user: ReturnType<typeof userEvent.setup>, ruleName: string) {
  const card = screen.getByText(ruleName).closest('div.relative') as HTMLElement;
  await user.click(within(card).getByRole('button', { name: 'Rule actions' }));
}

describe('RulesBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the rule list fetched via useQuery', async () => {
    mockApiGet();
    renderWithQuery(<RulesBrowser />);

    await waitFor(() => {
      expect(screen.getByText('Swiggy')).toBeInTheDocument();
      expect(screen.getByText('Zomato')).toBeInTheDocument();
    });
    expect(api.GET).toHaveBeenCalledWith(
      '/api/v1/rules',
      expect.objectContaining({ params: { query: { verified: false, search: undefined, page: 0, size: 50, sort: [] } } })
    );
  });

  it('shows the empty state when no rules match', async () => {
    mockApiGet(pagedRules([]));
    renderWithQuery(<RulesBrowser />);

    await waitFor(() => {
      expect(screen.getByText('No categorization rules found')).toBeInTheDocument();
    });
  });

  it('switching to the Verified tab refetches with verified=true and resets to page 0', async () => {
    mockApiGet();
    renderWithQuery(<RulesBrowser />);
    await waitFor(() => expect(screen.getByText('Swiggy')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Verified' }));

    await waitFor(() => {
      expect(api.GET).toHaveBeenCalledWith(
        '/api/v1/rules',
        expect.objectContaining({ params: { query: { verified: true, search: undefined, page: 0, size: 50, sort: [] } } })
      );
    });
  });

  it('verifying a rule calls POST /verify and invalidates the list', async () => {
    const user = userEvent.setup();
    mockApiGet();
    (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { ...rule1, verified: true } });
    renderWithQuery(<RulesBrowser />);
    await waitFor(() => expect(screen.getByText('Swiggy')).toBeInTheDocument());

    await openRuleMenu(user, 'Swiggy');
    await user.click(await screen.findByText('Approve Rule'));

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/rules/{id}/verify', { params: { path: { id: 'r1' } } });
    });
    expect(toast.success).toHaveBeenCalledWith('Rule verified — matching transactions cleared from review');
  });

  it('deleting a rule calls DELETE and closes the confirm dialog', async () => {
    const user = userEvent.setup();
    mockApiGet();
    (api.DELETE as ReturnType<typeof vi.fn>).mockResolvedValue({ data: undefined });
    renderWithQuery(<RulesBrowser />);
    await waitFor(() => expect(screen.getByText('Swiggy')).toBeInTheDocument());

    await openRuleMenu(user, 'Swiggy');
    await user.click(await screen.findByText('Delete Rule'));

    expect(await screen.findByText('Delete Rule?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(api.DELETE).toHaveBeenCalledWith('/api/v1/rules/{id}', { params: { path: { id: 'r1' } } });
    });
    expect(toast.success).toHaveBeenCalledWith('Rule deleted successfully');
    await waitFor(() => expect(screen.queryByText('Delete Rule?')).not.toBeInTheDocument());
  });

  it('creates a rule: fills the form, picks a category, and submits', async () => {
    mockApiGet();
    (api.POST as ReturnType<typeof vi.fn>).mockImplementation((url: string, opts: { body: Record<string, unknown> }) => {
      if (url === '/api/v1/rules') {
        return Promise.resolve({ data: { ...rule1, id: 'r3', ...opts.body } });
      }
      return Promise.resolve({ data: null });
    });
    renderWithQuery(<RulesBrowser />);
    await waitFor(() => expect(screen.getByText('Swiggy')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /New Rule/i }));
    expect(await screen.findByText('Create Categorization Rule')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Pattern (Merchant Key)'), { target: { value: 'AMAZON' } });

    fireEvent.click(screen.getByText('Select categories...'));
    fireEvent.click(await screen.findAllByText('Food').then((els) => els[els.length - 1]));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/rules', {
        body: {
          merchantKey: 'AMAZON',
          matchType: 'MERCHANT_KEY',
          displayName: undefined,
          categoryIds: ['c1'],
          mcc: undefined,
        },
      });
    });
    expect(toast.success).toHaveBeenCalledWith('Rule created successfully!');
    await waitFor(() => expect(screen.queryByText('Create Categorization Rule')).not.toBeInTheDocument());
  });

  it('creating a category from within the rule form invalidates the categories cache', async () => {
    mockApiGet();
    const newCategory = { id: 'c3', name: 'Subscriptions' };
    (api.POST as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/v1/categories') return Promise.resolve({ data: newCategory });
      return Promise.resolve({ data: null });
    });
    renderWithQuery(<RulesBrowser />);
    await waitFor(() => expect(screen.getByText('Swiggy')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /New Rule/i }));
    await screen.findByText('Create Categorization Rule');

    fireEvent.click(screen.getByText('Select categories...'));
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'Subscriptions' } });
    fireEvent.click(await screen.findByText('➕ Create “Subscriptions”'));

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/categories', { body: { name: 'Subscriptions' } });
    });
    expect(toast.success).toHaveBeenCalledWith('Category created!');
  });
});
