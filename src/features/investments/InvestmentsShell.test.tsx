import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
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
vi.mock('./epf/EpfAddDialog', async () => (await import('@/test/fakeDialog')).fakeDialog('dialog-epf', 'EpfAddDialog'));
vi.mock('./fno/FnoAddDialog', async () => (await import('@/test/fakeDialog')).fakeDialog('dialog-fno', 'FnoAddDialog'));
vi.mock('./corporate-actions/CorporateActionDialog', async () => (await import('@/test/fakeDialog')).fakeDialog('dialog-action', 'CorporateActionDialog'));
vi.mock('./instruments/InstrumentAddDialog', async () => (await import('@/test/fakeDialog')).fakeDialog('dialog-instrument', 'InstrumentAddDialog'));

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
});

describe('InvestmentsShell', () => {
  it('shows the seven tabs with Holdings active and the page below them', () => {
    renderShell();
    expect(tabTexts()).toEqual([
      'Holdings',
      'EPF',
      'Dividends',
      'Tradebook',
      'F&O',
      'Corporate actions',
      'Instruments',
    ]);
    expect(screen.getByRole('tab', { name: 'Holdings' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('tab body')).toBeInTheDocument();
  });

  it('shows no counts on any tab', () => {
    renderShell();
    expect(tabTexts()).toEqual(['Holdings', 'EPF', 'Dividends', 'Tradebook', 'F&O', 'Corporate actions', 'Instruments']);
  });

  it('links every tab to its Dinero page', () => {
    renderShell();
    const href = (label: RegExp) => screen.getByRole('tab', { name: label }).getAttribute('href');
    expect(href(/^Holdings/)).toBe('/investments');
    expect(href(/^EPF/)).toBe('/investments/epf');
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

  it('has the title Investments with its crumb and its add button', () => {
    renderShell();
    expect(screen.getAllByText('Investments').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Grow').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Record trade' }).length).toBeGreaterThan(0);
  });

  it('opens no dialog until + is pressed', () => {
    renderShell();
    expect(screen.queryByTestId(/^dialog-/)).toBeNull();
  });

  it.each([
    ['/investments', 'trade', 'Record trade'],
    ['/investments/epf', 'epf', 'Record EPF entry'],
    ['/investments/dividends', 'dividend', 'Record dividend'],
    ['/investments/corporate-actions', 'action', 'Record corporate action'],
    ['/investments/instruments', 'instrument', 'Add instrument'],
  ])('opens the dialog of %s with the top bar + (labelled verb and object)', (path, dialog, label) => {
    pathname = path;
    renderShell();
    fireEvent.click(screen.getAllByRole('button', { name: label })[0]);
    expect(screen.getByTestId(`dialog-${dialog}`)).toBeInTheDocument();
    expect(screen.getAllByTestId(/^dialog-/)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'close dialog' }));
    expect(screen.queryByTestId(/^dialog-/)).toBeNull();
  });

  it.each([
    ['/investments/tradebook', 'trade', 'Add trade', 'Record trade', 'Import tradebook'],
    ['/investments/fno', 'fno', 'Add F&O trade', 'Record F&O trade', 'Import statement'],
  ])('makes the + on %s a menu with the add and the import', (path, dialog, buttonLabel, addLabel, importLabel) => {
    pathname = path;
    renderShell();
    fireEvent.pointerDown(screen.getAllByRole('button', { name: buttonLabel })[0], { button: 0 });
    expect(screen.queryByTestId(/^dialog-/)).toBeNull();
    expect(screen.getByRole('menuitem', { name: importLabel })).toHaveAttribute('href', '/investments/import');
    fireEvent.click(screen.getByRole('menuitem', { name: addLabel }));
    expect(screen.getByTestId(`dialog-${dialog}`)).toBeInTheDocument();
  });

  it('keeps the + a plain button on Holdings, Dividends, Corporate actions and Instruments', () => {
    for (const [path, label] of [
      ['/investments', 'Record trade'],
      ['/investments/dividends', 'Record dividend'],
      ['/investments/corporate-actions', 'Record corporate action'],
      ['/investments/instruments', 'Add instrument'],
    ]) {
      pathname = path;
      const { unmount } = renderShell();
      fireEvent.pointerDown(screen.getAllByRole('button', { name: label })[0], { button: 0 });
      expect(screen.queryByRole('menu'), path).toBeNull();
      unmount();
    }
  });
});
