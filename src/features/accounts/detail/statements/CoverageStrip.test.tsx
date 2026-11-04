import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CoverageStrip } from './CoverageStrip';

const refresh = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push }) }));
const mark = vi.fn();
const unmark = vi.fn();
vi.mock('./coverageActions', () => ({
  markMonthEmpty: (...a: unknown[]) => mark(...a),
  unmarkMonthEmpty: (...a: unknown[]) => unmark(...a),
}));
const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', () => ({ showToast: (...a: unknown[]) => toast(...a) }));

const coverage = {
  months: [
    { month: '2026-01', state: 'DATA' as const },
    { month: '2026-02', state: 'EMPTY' as const },
    { month: '2026-03', state: 'MARKED_EMPTY' as const },
  ],
};

function openMenu(month: string) {
  const cell = document.querySelector(`[data-month="${month}"]`) as HTMLElement;
  fireEvent.pointerDown(cell, { button: 0 });
}

beforeEach(() => {
  vi.clearAllMocks();
  mark.mockResolvedValue({ success: true, data: undefined });
  unmark.mockResolvedValue({ success: true, data: undefined });
});

describe('CoverageStrip', () => {
  it('shows the year, the months and the legend; data cells are not buttons', () => {
    render(<CoverageStrip accountId="a1" coverage={coverage} />);
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(document.querySelector('[data-month="2026-01"]')?.tagName).toBe('SPAN');
    expect(document.querySelector('[data-month="2026-02"]')?.tagName).toBe('BUTTON');
    expect(screen.getByText('Nothing found')).toBeInTheDocument();
  });

  it('marks an empty month, then offers Undo that unmarks it', async () => {
    render(<CoverageStrip accountId="a1" coverage={coverage} />);
    openMenu('2026-02');
    fireEvent.click(await screen.findByText('Nothing happened that month'));
    await waitFor(() => expect(mark).toHaveBeenCalledWith('a1', '2026-02'));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const opts = toast.mock.calls[0][1] as { action: { onSelect: () => void } };
    opts.action.onSelect();
    await waitFor(() => expect(unmark).toHaveBeenCalledWith('a1', '2026-02'));
  });

  it('opens the import screen for the account from Upload statement', async () => {
    render(<CoverageStrip accountId="a1" coverage={coverage} />);
    openMenu('2026-02');
    fireEvent.click(await screen.findByText('Upload statement'));
    expect(push).toHaveBeenCalledWith('/transactions/import?account=a1');
  });

  it('unmarks a marked month', async () => {
    render(<CoverageStrip accountId="a1" coverage={coverage} />);
    openMenu('2026-03');
    fireEvent.click(await screen.findByText('Undo: something happened'));
    await waitFor(() => expect(unmark).toHaveBeenCalledWith('a1', '2026-03'));
  });
});
