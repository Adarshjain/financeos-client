import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InvestmentsShell } from './InvestmentsShell';

let pathname = '/ds/investments';
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
  pathname = '/ds/investments';
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
    expect(href(/^Holdings/)).toBe('/ds/investments');
    expect(href(/^Tradebook/)).toBe('/ds/investments/tradebook');
    expect(href(/^Dividends/)).toBe('/ds/investments/dividends');
    expect(href(/^F&O/)).toBe('/ds/investments/fno');
    expect(href(/^Corporate actions/)).toBe('/ds/investments/corporate-actions');
    expect(href(/^Instruments/)).toBe('/ds/investments/instruments');
  });

  it('marks the tab the pathname is on', () => {
    const cases: [string, string][] = [
      ['/ds/investments', 'Holdings'],
      ['/ds/investments/tradebook', 'Tradebook'],
      ['/ds/investments/dividends', 'Dividends'],
      ['/ds/investments/fno', 'F&O'],
      ['/ds/investments/corporate-actions', 'Corporate actions'],
      ['/ds/investments/instruments', 'Instruments'],
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
    ['/ds/investments', 'trade'],
    ['/ds/investments/dividends', 'dividend'],
    ['/ds/investments/corporate-actions', 'action'],
    ['/ds/investments/instruments', 'instrument'],
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
    ['/ds/investments/tradebook', 'trade', 'Record trade', 'Import tradebook'],
    ['/ds/investments/fno', 'fno', 'Add F&O trade', 'Import statement'],
  ])('makes the + on %s a menu with the add and the import', (path, dialog, addLabel, importLabel) => {
    pathname = path;
    renderShell();
    fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Add' })[0], { button: 0 });
    expect(screen.queryByTestId(/^dialog-/)).toBeNull();
    expect(screen.getByRole('menuitem', { name: importLabel })).toHaveAttribute('href', '/ds/investments/import');
    fireEvent.click(screen.getByRole('menuitem', { name: addLabel }));
    expect(screen.getByTestId(`dialog-${dialog}`)).toBeInTheDocument();
  });

  it('keeps the + a plain button on Holdings, Dividends, Corporate actions and Instruments', () => {
    for (const path of ['/ds/investments', '/ds/investments/dividends', '/ds/investments/corporate-actions', '/ds/investments/instruments']) {
      pathname = path;
      const { unmount } = renderShell();
      fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Add' })[0], { button: 0 });
      expect(screen.queryByRole('menu'), path).toBeNull();
      unmount();
    }
  });

  it("renders a holding's own page without the tab strip", () => {
    pathname = '/ds/investments/i1';
    renderShell();
    expect(screen.getByText('tab body')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(loadTabCounts).not.toHaveBeenCalled();
  });
});
