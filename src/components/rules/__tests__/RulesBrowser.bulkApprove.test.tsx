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
const rule3 = { ...rule1, id: 'r3', merchantKey: 'UBER', displayName: 'Uber' };
const rule4 = { ...rule1, id: 'r4', merchantKey: 'OLA', displayName: 'Ola' };
const rule5 = { ...rule1, id: 'r5', merchantKey: 'IRCTC', displayName: 'Irctc', verified: true };

type Mock = ReturnType<typeof vi.fn>;

/** Pages of the rules list by page number; every page reports the same totals. */
function mockApiGet(pages: unknown[][] = [[rule1, rule2, rule3]]) {
  (api.GET as Mock).mockImplementation((url: string, opts?: { params?: { query?: { page?: number } } }) => {
    if (url === '/api/v1/rules') {
      const page = opts?.params?.query?.page ?? 0;
      const content = pages[page] ?? [];
      return Promise.resolve({
        data: {
          content,
          totalElements: pages.flat().length,
          totalPages: pages.length,
          size: 50,
          number: page,
          first: page === 0,
          last: page === pages.length - 1,
          empty: content.length === 0,
        },
      });
    }
    if (url === '/api/v1/categories') return Promise.resolve({ data: categories });
    if (url === '/api/v1/jobs') return Promise.resolve({ data: { content: [] } });
    return Promise.resolve({ data: null });
  });
}

function mockBulkVerify(verifiedCount: number) {
  (api.POST as Mock).mockImplementation((url: string) => {
    if (url === '/api/v1/rules/verify') return Promise.resolve({ data: { verifiedCount } });
    return Promise.resolve({ data: null });
  });
}

async function renderLoaded(pages?: unknown[][]) {
  mockApiGet(pages);
  renderWithQuery(<RulesBrowser />);
  const first = (pages ?? [[rule1]])[0][0] as { displayName: string };
  await waitFor(() => expect(screen.getByText(first.displayName)).toBeInTheDocument());
}

const selectBox = (name: string) => screen.getByRole('checkbox', { name: `Select ${name}` });
const selectAll = () => screen.getByRole('checkbox', { name: 'Select All Unverified on Page' });

/** The search debounce resets to page 0 300ms after mount; page only once it has fired. */
async function waitForInitialDebounce() {
  await new Promise((r) => setTimeout(r, 350));
}

function cardOf(name: string) {
  return screen.getByText(name).closest('div.relative') as HTMLElement;
}

/** The bulk Approve in the selection bar, not a card's own Approve button. */
function bulkApproveButton() {
  const bar = screen.getByText(/\d+ selected/).parentElement as HTMLElement;
  return within(bar).getByRole('button');
}

function rulesGetCount() {
  return (api.GET as Mock).mock.calls.filter(([url]) => url === '/api/v1/rules').length;
}

function pickOption(filterLabel: string, optionText: string) {
  fireEvent.click(screen.getByRole('combobox', { name: filterLabel }));
  fireEvent.click(within(screen.getByRole('listbox')).getByText(optionText));
}

describe('RulesBrowser bulk approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a select checkbox only on unverified rules', async () => {
    await renderLoaded();

    expect(selectBox('Swiggy')).toBeInTheDocument();
    expect(selectBox('Uber')).toBeInTheDocument();
    expect(within(cardOf('Zomato')).queryByRole('checkbox')).toBeNull();
  });

  it('hides the select-all row when the page has no unverified rules and nothing is selected', async () => {
    await renderLoaded([[rule2]]);

    expect(screen.queryByRole('checkbox', { name: 'Select All Unverified on Page' })).toBeNull();
  });

  it('shows no count or Approve until a rule is selected', async () => {
    await renderLoaded();

    expect(screen.queryByText(/\d+ selected/)).toBeNull();
  });

  it('approving the selection posts the selected ids, toasts the count, clears the selection and refetches', async () => {
    await renderLoaded();
    mockBulkVerify(2);

    fireEvent.click(selectBox('Swiggy'));
    fireEvent.click(selectBox('Uber'));
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    const getsBefore = rulesGetCount();
    fireEvent.click(bulkApproveButton());

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/rules/verify', { body: { ruleIds: ['r1', 'r3'] } });
    });
    expect(toast.success).toHaveBeenCalledWith('2 rules verified — matching transactions cleared from review');
    await waitFor(() => expect(screen.queryByText(/\d+ selected/)).toBeNull());
    expect(selectBox('Swiggy')).not.toBeChecked();
    await waitFor(() => expect(rulesGetCount()).toBeGreaterThan(getsBefore));
  });

  it('uses the singular in the toast when one rule was verified', async () => {
    await renderLoaded();
    mockBulkVerify(1);

    fireEvent.click(selectBox('Swiggy'));
    fireEvent.click(bulkApproveButton());

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('1 rule verified — matching transactions cleared from review');
    });
  });

  it('disables Approve and shows progress while the request is in flight', async () => {
    await renderLoaded();
    let resolve: (v: unknown) => void = () => {};
    (api.POST as Mock).mockImplementation(() => new Promise((r) => (resolve = r)));

    fireEvent.click(selectBox('Swiggy'));
    fireEvent.click(bulkApproveButton());

    await waitFor(() => expect(bulkApproveButton()).toBeDisabled());
    expect(bulkApproveButton()).toHaveTextContent('Approving...');

    resolve({ data: { verifiedCount: 1 } });
    await waitFor(() => expect(screen.queryByText(/\d+ selected/)).toBeNull());
  });

  it('a failed approve shows an error and keeps the selection', async () => {
    await renderLoaded();
    (api.POST as Mock).mockRejectedValue(new Error('boom'));

    fireEvent.click(selectBox('Swiggy'));
    fireEvent.click(bulkApproveButton());

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(selectBox('Swiggy')).toBeChecked();
  });

  it('unchecking a selected rule removes it from the selection', async () => {
    await renderLoaded();

    fireEvent.click(selectBox('Swiggy'));
    fireEvent.click(selectBox('Uber'));
    fireEvent.click(selectBox('Swiggy'));

    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(selectBox('Swiggy')).not.toBeChecked();
    expect(selectBox('Uber')).toBeChecked();
  });

  it('select all picks only the page\'s unverified rules; partial selection is indeterminate; unchecking clears them', async () => {
    await renderLoaded();

    fireEvent.click(selectBox('Swiggy'));
    expect(selectAll()).toHaveAttribute('data-state', 'indeterminate');

    fireEvent.click(selectAll());
    expect(selectAll()).toBeChecked();
    expect(selectBox('Swiggy')).toBeChecked();
    expect(selectBox('Uber')).toBeChecked();
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    fireEvent.click(selectAll());
    expect(selectAll()).not.toBeChecked();
    expect(screen.queryByText(/\d+ selected/)).toBeNull();
  });

  it('keeps the selection across pages and approves rules from every page', async () => {
    await renderLoaded([[rule1, rule2], [rule4, rule5]]);
    mockBulkVerify(2);
    await waitForInitialDebounce();

    fireEvent.click(selectBox('Swiggy'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Next page' })[0]);
    await waitFor(() => expect(screen.getByText('Ola')).toBeInTheDocument());

    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(selectAll()).not.toBeChecked();

    fireEvent.click(selectAll());
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    fireEvent.click(bulkApproveButton());
    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/rules/verify', { body: { ruleIds: ['r1', 'r4'] } });
    });
  });

  it('still offers Approve on a page with no unverified rules when rules are selected elsewhere', async () => {
    await renderLoaded([[rule1], [rule5]]);
    await waitForInitialDebounce();

    fireEvent.click(selectBox('Swiggy'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Next page' })[0]);
    await waitFor(() => expect(screen.getByText('Irctc')).toBeInTheDocument());

    expect(selectAll()).toBeDisabled();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(bulkApproveButton()).toBeEnabled();
  });

  it('switching tabs clears the selection', async () => {
    await renderLoaded();

    fireEvent.click(selectBox('Swiggy'));
    fireEvent.click(screen.getByRole('button', { name: 'All' }));

    await waitFor(() => expect(screen.queryByText(/\d+ selected/)).toBeNull());
  });

  it('changing a filter clears the selection', async () => {
    await renderLoaded();

    fireEvent.click(selectBox('Swiggy'));
    pickOption('Source', 'LLM-generated');

    await waitFor(() => expect(screen.queryByText(/\d+ selected/)).toBeNull());
  });

  it('clearing filters clears the selection', async () => {
    await renderLoaded();
    pickOption('Source', 'LLM-generated');
    await waitFor(() => expect(selectBox('Swiggy')).toBeInTheDocument());

    fireEvent.click(selectBox('Swiggy'));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Clear filters/i }));

    await waitFor(() => expect(screen.queryByText(/\d+ selected/)).toBeNull());
  });

  it('searching clears the selection', async () => {
    await renderLoaded();

    fireEvent.click(selectBox('Swiggy'));
    fireEvent.change(screen.getByPlaceholderText('Search merchant keys or display names...'), {
      target: { value: 'swi' },
    });

    await waitFor(() => expect(screen.queryByText(/\d+ selected/)).toBeNull());
  });

  it('a selection made right after load survives the initial search debounce', async () => {
    await renderLoaded();

    fireEvent.click(selectBox('Swiggy'));
    await new Promise((r) => setTimeout(r, 400));

    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(selectBox('Swiggy')).toBeChecked();
  });

  it('approving a selected rule from its card removes it from the selection', async () => {
    await renderLoaded();
    (api.POST as Mock).mockResolvedValue({ data: { ...rule1, verified: true } });

    fireEvent.click(selectBox('Swiggy'));
    fireEvent.click(selectBox('Uber'));
    fireEvent.click(within(cardOf('Swiggy')).getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(screen.getByText('1 selected')).toBeInTheDocument());
  });

  it('deleting a selected rule removes it from the selection', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    (api.DELETE as Mock).mockResolvedValue({ data: undefined });

    fireEvent.click(selectBox('Swiggy'));
    fireEvent.click(selectBox('Uber'));
    await user.click(within(cardOf('Swiggy')).getByRole('button', { name: 'Rule actions' }));
    await user.click(await screen.findByText('Delete Rule'));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.getByText('1 selected')).toBeInTheDocument());
    mockBulkVerify(1);
    fireEvent.click(bulkApproveButton());
    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/rules/verify', { body: { ruleIds: ['r3'] } });
    });
  });
});
