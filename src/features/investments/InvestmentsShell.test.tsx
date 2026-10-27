import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InvestmentsShell } from './InvestmentsShell';

let pathname = '/investments';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));

// The add dialogs are tested on their own: here each one only says which it is.
vi.mock('./tradebook/TradeDialog', async () => (await import('@/test/fakeDialog')).fakeDialog('dialog-trade', 'RecordTradeDialog'));
vi.mock('./dividends/DividendFormDialog', async () => (await import('@/test/fakeDialog')).fakeDialog('dialog-dividend', 'DividendAddDialog'));
vi.mock('./fno/FnoAddDialog', async () => (await import('@/test/fakeDialog')).fakeDialog('dialog-fno', 'FnoAddDialog'));
vi.mock('./corporate-actions/CorporateActionDialog', async () => (await import('@/test/fakeDialog')).fakeDialog('dialog-action', 'CorporateActionDialog'));
vi.mock('./instruments/InstrumentAddDialog', async () => (await import('@/test/fakeDialog')).fakeDialog('dialog-instrument', 'InstrumentAddDialog'));

const loadTabCounts = vi.fn();
vi.mock('./tabCountsActions', () => ({ loadTabCounts: () => loadTabCounts() }));

const tabTexts = () => screen.getAllByRole('tab').map((t) => t.textContent);

function renderShell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InvestmentsShell>
        <p>tab body</p>
      </InvestmentsShell>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  pathname = '/investments';
  loadTabCounts.mockReset();
  loadTabCounts.mockResolvedValue({
    success: true,
    data: { tradebook: 38, dividends: 5, fno: 5, 'corporate-actions': 2 },
  });
});

describe('InvestmentsShell', () => {
  it('shows the six tabs with Holdings active and the page below them', () => {
    renderShell();
    expect(tabTexts()).toEqual([
      'Holdings',
      'Tradebook',
      'Dividends',
      'F&O',
      'Corporate actions',
      'Instruments',
    ]);
    expect(screen.getByRole('tab', { name: 'Holdings' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('tab body')).toBeInTheDocument();
  });

  it('puts the counts on Tradebook, Dividends, F&O and Corporate actions once they load, and none on Holdings or Instruments', async () => {
    renderShell();
    await waitFor(() => expect(tabTexts()).toContain('Tradebook · 38'));
    expect(tabTexts()).toEqual(['Holdings', 'Tradebook · 38', 'Dividends · 5', 'F&O · 5', 'Corporate actions · 2', 'Instruments']);
  });

  it('links every tab to its Dinero page', () => {
    renderShell();
    const href = (label: RegExp) => screen.getByRole('tab', { name: label }).getAttribute('href');
    expect(href(/^Holdings/)).toBe('/investments');
    expect(href(/^Tradebook/)).toBe('/investments/tradebook');
    expect(href(/^Dividends/)).toBe('/investments/dividends');
    expect(href(/^F&O/)).toBe('/investments/fno');
    expect(href(/^Corporate actions/)).toBe('/investments/corporate-actions');
    expect(href(/^Instruments/)).toBe('/investments/instruments');
  });

  it('marks the tab the pathname is on', () => {
    const cases: [string, string][] = [
      ['/investments', 'Holdings'],
      ['/investments/tradebook', 'Tradebook'],
      ['/investments/dividends', 'Dividends'],
      ['/investments/fno', 'F&O'],
      ['/investments/corporate-actions', 'Corporate actions'],
      ['/investments/instruments', 'Instruments'],
    ];
    for (const [path, label] of cases) {
      pathname = path;
      const { unmount } = renderShell();
      expect(screen.getByRole('tab', { name: new RegExp(`^${label}`) }), path).toHaveAttribute('data-state', 'active');
      unmount();
    }
  });

  it('keeps the tabs without counts when the counts fail', async () => {
    loadTabCounts.mockResolvedValue({ success: false, error: { message: 'down' } });
    renderShell();
    await waitFor(() => expect(loadTabCounts).toHaveBeenCalled());
    expect(screen.getByRole('tab', { name: 'Tradebook' })).toBeInTheDocument();
  });

  it('has the title Investments with its crumb and an Add button', () => {
    renderShell();
    expect(screen.getAllByText('Investments').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Grow').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Add' }).length).toBeGreaterThan(0);
  });

  it('opens no dialog until + is pressed', () => {
    renderShell();
    expect(screen.queryByTestId(/^dialog-/)).toBeNull();
  });

  it.each([
    ['/investments', 'trade'],
    ['/investments/dividends', 'dividend'],
    ['/investments/corporate-actions', 'action'],
    ['/investments/instruments', 'instrument'],
  ])('opens the dialog of %s with the top bar +', (path, dialog) => {
    pathname = path;
    renderShell();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add' })[0]);
    expect(screen.getByTestId(`dialog-${dialog}`)).toBeInTheDocument();
    expect(screen.getAllByTestId(/^dialog-/)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'close dialog' }));
    expect(screen.queryByTestId(/^dialog-/)).toBeNull();
  });

  it.each([
    ['/investments/tradebook', 'trade', 'Record trade', 'Import tradebook'],
    ['/investments/fno', 'fno', 'Add F&O trade', 'Import statement'],
  ])('makes the + on %s a menu with the add and the import', (path, dialog, addLabel, importLabel) => {
    pathname = path;
    renderShell();
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Add' })[0], { button: 0 });
    expect(screen.queryByTestId(/^dialog-/)).toBeNull();
    expect(screen.getByRole('menuitem', { name: importLabel })).toHaveAttribute('href', '/investments/import');
    fireEvent.click(screen.getByRole('menuitem', { name: addLabel }));
    expect(screen.getByTestId(`dialog-${dialog}`)).toBeInTheDocument();
  });

  it('keeps the + a plain button on Holdings, Dividends, Corporate actions and Instruments', () => {
    for (const path of ['/investments', '/investments/dividends', '/investments/corporate-actions', '/investments/instruments']) {
      pathname = path;
      const { unmount } = renderShell();
      fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Add' })[0], { button: 0 });
      expect(screen.queryByRole('menu'), path).toBeNull();
      unmount();
    }
  });

  it("renders a holding's own page without the tab strip", () => {
    pathname = '/investments/i1';
    renderShell();
    expect(screen.getByText('tab body')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(loadTabCounts).not.toHaveBeenCalled();
  });
});
