import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const loadScanState = vi.hoisted(() => vi.fn());
vi.mock('./suggestionActions', () => ({ loadScanState }));

import type { ScanState } from '@/features/accounts/list/suggestionsModel';

import { ScanProgressCard } from './ScanProgressCard';

const scan = (over: Partial<ScanState> = {}): ScanState => ({
  status: 'RUNNING',
  firstScanDone: false,
  mailsSeen: 4020,
  mailsTotal: 10600,
  gmailConnected: true,
  ...over,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
});

describe('ScanProgressCard', () => {
  it('shows the title, the counts with the time left, and the reassurance line', () => {
    render(<ScanProgressCard scan={scan()} />);
    expect(screen.getByText('Finding your accounts')).toBeInTheDocument();
    expect(screen.getByText('Read 4,020 of 10,600 emails. About 6 minutes left.')).toBeInTheDocument();
    expect(screen.getByText("Keep using FinanceOS. We'll let you know what we find.")).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('says it is reading while the total is unknown', () => {
    render(<ScanProgressCard scan={scan({ mailsSeen: 0, mailsTotal: 0 })} />);
    expect(screen.getByText('Reading your emails.')).toBeInTheDocument();
  });

  it('draws nothing when the scan is not one to show', () => {
    const { container } = render(<ScanProgressCard scan={scan({ firstScanDone: true })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('asks for progress every 5 seconds and shows the new counts', async () => {
    loadScanState.mockResolvedValue({ success: true, data: scan({ mailsSeen: 6000 }) });
    render(<ScanProgressCard scan={scan()} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(loadScanState).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Read 6,000 of 10,600 emails/)).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('refreshes the page once and hides itself when the first scan finishes', async () => {
    loadScanState.mockResolvedValue({ success: true, data: scan({ firstScanDone: true, status: 'IDLE' }) });
    const { container } = render(<ScanProgressCard scan={scan()} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(container).toBeEmptyDOMElement();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(loadScanState).toHaveBeenCalledTimes(1);
  });

  it('does not ask while the page is hidden', async () => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    render(<ScanProgressCard scan={scan()} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(loadScanState).not.toHaveBeenCalled();
  });

  it('stops asking once unmounted', async () => {
    const { unmount } = render(<ScanProgressCard scan={scan()} />);
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(loadScanState).not.toHaveBeenCalled();
  });
});
