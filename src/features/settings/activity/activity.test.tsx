import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JobResponse } from '@/lib/types';

import { ActivityPage } from './ActivityPage';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/settings/activity',
}));

let jobs: JobResponse[] = [];
let totalElements = 0;
let pending = false;
const historyArgs: unknown[] = [];
vi.mock('@/features/jobs/useJobsHistory', () => ({
  useJobsHistory: (f: unknown) => {
    historyArgs.push(f);
    return { jobs, totalPages: Math.ceil(totalElements / 25), totalElements, isPending: pending };
  },
}));

let fetched: JobResponse | null = null;
let fetchError: string | null = null;
const polled: Array<string | null> = [];
vi.mock('@/features/jobs/useJobStatusPolling', () => ({
  useJobStatusPolling: (id: string | null) => {
    polled.push(id);
    return { job: id ? fetched : null, isPolling: false, error: fetchError };
  },
}));

const cancel = vi.fn();
const retry = vi.fn();
vi.mock('@/features/jobs/useJobActions', () => ({
  useJobActions: () => ({ cancel, retry, busy: false }),
}));

const NOW = new Date().toISOString();
const job = (over: Partial<JobResponse>): JobResponse =>
  ({
    id: 'j1',
    type: 'GMAIL_SYNC',
    status: 'SUCCEEDED',
    triggerSource: 'USER',
    cancelRequested: false,
    attempt: 1,
    createdAt: NOW,
    startedAt: NOW,
    finishedAt: new Date(new Date(NOW).getTime() + 6100).toISOString(),
    result: { mailbox: 'arjun@gmail.test', processed: 4, created: 3, parked: 1, reconciled: 0, skipped: 0 },
    ...over,
  }) as JobResponse;

const props = { statusFilter: '', typeFilter: '', page: 0, size: 25, jobId: null as string | null };

beforeEach(() => {
  push.mockReset();
  cancel.mockReset();
  retry.mockReset();
  jobs = [];
  totalElements = 0;
  pending = false;
  fetched = null;
  fetchError = null;
  historyArgs.length = 0;
  polled.length = 0;
});

describe('filters', () => {
  it('shows "Status: All" and "Type: All" by default', () => {
    render(<ActivityPage {...props} />);
    expect(screen.getByRole('button', { name: /Status: All/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Type: All/ })).toBeInTheDocument();
  });

  it('shows the choice on the chip, with no count', () => {
    render(<ActivityPage {...props} statusFilter="FAILED" typeFilter="GMAIL_SYNC" />);
    expect(screen.getByRole('button', { name: /^Status: Failed$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Type: Gmail sync/ })).toBeInTheDocument();
  });

  it('lists every status without counts, and navigates on pick', () => {
    render(<ActivityPage {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Status: All/ }));
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['All statuses', 'Running', 'Succeeded', 'Failed', 'Cancelled']);
    fireEvent.click(screen.getByRole('option', { name: /Failed/ }));
    expect(push).toHaveBeenCalledWith('/settings/activity?status=FAILED', { scroll: false });
  });

  it('lists all six types and navigates on pick, keeping the status and resetting the page', () => {
    render(<ActivityPage {...props} statusFilter="SUCCEEDED" page={3} />);
    fireEvent.click(screen.getByRole('button', { name: /Type: All/ }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'All types',
      'Statement ingest',
      'Gmail sync',
      'Price refresh',
      'Import commit',
      'Reconcile commit',
      'Rule apply',
    ]);
    fireEvent.click(screen.getByRole('option', { name: 'Price refresh' }));
    expect(push).toHaveBeenCalledWith('/settings/activity?status=SUCCEEDED&type=PRICE_REFRESH', { scroll: false });
  });

  it('choosing all statuses clears the filter', () => {
    render(<ActivityPage {...props} statusFilter="FAILED" />);
    fireEvent.click(screen.getByRole('button', { name: /Status: Failed/ }));
    fireEvent.click(screen.getByRole('option', { name: 'All statuses' }));
    expect(push).toHaveBeenCalledWith('/settings/activity', { scroll: false });
  });
});

describe('list', () => {
  it('shows the empty text when no job matches', () => {
    render(<ActivityPage {...props} />);
    expect(screen.getByText('No background jobs found matching the selected filters.')).toBeInTheDocument();
  });

  it('offers Clear filters only when a filter is set', () => {
    const { unmount } = render(<ActivityPage {...props} />);
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
    unmount();
    render(<ActivityPage {...props} statusFilter="FAILED" typeFilter="GMAIL_SYNC" />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(push).toHaveBeenCalledWith('/settings/activity', { scroll: false });
  });

  it('shows Job with its subject, Started, Took, Result and Status', () => {
    jobs = [job({})];
    totalElements = 1;
    render(<ActivityPage {...props} />);
    for (const h of ['Job', 'Started', 'Took', 'Result', 'Status']) expect(screen.getByText(h)).toBeInTheDocument();
    expect(screen.getAllByText('Gmail sync').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/arjun@gmail.test/).length).toBeGreaterThan(0);
    expect(screen.getByText(/^today \d{1,2}:\d{2} (am|pm)$/)).toBeInTheDocument();
    expect(screen.getByText('6.1 s')).toBeInTheDocument();
    expect(screen.getByText('4 emails · 3 transactions · 1 needs attention')).toBeInTheDocument();
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });

  it('a job without a subject shows only its type', () => {
    jobs = [job({ id: 'p', type: 'INVESTMENT_IMPORT_COMMIT', result: { committed: 14, skipped: 24, failed: [], skippedItems: [] } })];
    totalElements = 1;
    render(<ActivityPage {...props} />);
    expect(screen.getAllByText('Import commit').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Import commit ·/)).toBeNull();
    expect(screen.getByText('14 imported · 24 skipped')).toBeInTheDocument();
  });

  it('a running job shows its note and a determinate bar, and no Took', () => {
    jobs = [
      job({
        id: 'r',
        type: 'STATEMENT_INGEST',
        status: 'RUNNING',
        result: null,
        finishedAt: null,
        progressNote: 'Parsing page 2 of 3',
        progressCurrent: 2,
        progressTotal: 3,
      }),
    ];
    totalElements = 1;
    render(<ActivityPage {...props} />);
    expect(screen.getAllByText('Parsing page 2 of 3').length).toBeGreaterThan(0);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '3');
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('a running job with no total shows an indeterminate bar', () => {
    jobs = [job({ id: 'r', status: 'RUNNING', result: null, finishedAt: null, progressTotal: null })];
    totalElements = 1;
    render(<ActivityPage {...props} />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  });

  it('a failed job shows its error in danger tone', () => {
    jobs = [job({ id: 'f', status: 'FAILED', result: null, errorMessage: 'Token expired (invalid_grant)', finishedAt: null })];
    totalElements = 1;
    render(<ActivityPage {...props} />);
    const error = screen.getAllByText('Token expired (invalid_grant)')[0];
    expect(error.className).toMatch(/danger/);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('a cancelled job shows "Cancelled by you"', () => {
    jobs = [job({ id: 'c', status: 'CANCELLED', result: null })];
    totalElements = 1;
    render(<ActivityPage {...props} />);
    expect(screen.getAllByText('Cancelled by you').length).toBeGreaterThan(0);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('View links to ?job= keeping filters and page', () => {
    jobs = [job({ id: 'abc' })];
    totalElements = 60;
    render(<ActivityPage {...props} statusFilter="SUCCEEDED" page={1} />);
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      '/settings/activity?status=SUCCEEDED&page=1&job=abc',
    );
  });

  it('opens a job on a row press', () => {
    jobs = [job({ id: 'abc' })];
    totalElements = 1;
    render(<ActivityPage {...props} />);
    fireEvent.click(screen.getByText('6.1 s'));
    expect(push).toHaveBeenCalledWith('/settings/activity?job=abc', { scroll: false });
  });
});

describe('pager', () => {
  beforeEach(() => {
    jobs = [job({})];
    totalElements = 60;
  });

  it('is above and below the list, with 25 rows a page by default', () => {
    render(<ActivityPage {...props} />);
    expect(historyArgs[0]).toMatchObject({ page: 0, size: 25 });
    const pickers = screen.getAllByRole('button', { name: 'Rows per page' });
    expect(pickers).toHaveLength(2);
    expect(pickers[0]).toHaveTextContent('25');
  });

  it('changing the size goes to page 0 with ?size=', () => {
    render(<ActivityPage {...props} page={2} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Rows per page' })[0]);
    fireEvent.click(screen.getByRole('option', { name: /50/ }));
    expect(push).toHaveBeenCalledWith('/settings/activity?size=50', { scroll: false });
  });

  it('paging keeps the filters and the open job', () => {
    render(<ActivityPage {...props} statusFilter="SUCCEEDED" jobId="abc" />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Next page' })[0]);
    expect(push).toHaveBeenCalledWith('/settings/activity?status=SUCCEEDED&page=1&job=abc', { scroll: false });
  });
});

describe('job result card', () => {
  it('is not shown without ?job=', () => {
    jobs = [job({})];
    render(<ActivityPage {...props} />);
    expect(screen.queryByTestId('job-result-card')).toBeNull();
  });

  it('opens from the page rows with the header, started-by line and the full result, without fetching', () => {
    jobs = [job({ id: 'abc' })];
    totalElements = 1;
    render(<ActivityPage {...props} jobId="abc" />);
    const card = screen.getByTestId('job-result-card');
    expect(within(card).getByText(/^Job result · Gmail sync · today \d{1,2}:\d{2} (am|pm)$/)).toBeInTheDocument();
    expect(within(card).getByText('Started by you · took 6.1 s')).toBeInTheDocument();
    expect(within(card).getByTestId('gmail-sync-result')).toBeInTheDocument();
    expect(polled.every((id) => id === null)).toBe(true);
  });

  it('says "Started automatically" for a scheduled job', () => {
    jobs = [job({ id: 'abc', triggerSource: 'CRON' })];
    render(<ActivityPage {...props} jobId="abc" />);
    expect(screen.getByText('Started automatically · took 6.1 s')).toBeInTheDocument();
  });

  it('fetches the job when it is not on the page, showing loading then the result', () => {
    jobs = [job({ id: 'other' })];
    const { rerender } = render(<ActivityPage {...props} jobId="far" />);
    expect(polled).toContain('far');
    expect(screen.getByText('Loading job…')).toBeInTheDocument();
    fetched = job({ id: 'far', type: 'PRICE_REFRESH', result: { refreshed: 3, skipped: 0, failed: [], asOf: '2026-10-20' } });
    rerender(<ActivityPage {...props} jobId="far" />);
    const card = screen.getByTestId('job-result-card');
    expect(within(card).getByText(/Job result · Price refresh/)).toBeInTheDocument();
    expect(within(card).getByTestId('price-refresh-result')).toBeInTheDocument();
  });

  it('shows the fetch error when the job cannot be loaded', () => {
    fetchError = 'Job not found';
    render(<ActivityPage {...props} jobId="gone" />);
    expect(screen.getByText('Job not found')).toBeInTheDocument();
  });

  it('Close clears ?job= and keeps filters and page', () => {
    jobs = [job({ id: 'abc' })];
    render(<ActivityPage {...props} statusFilter="SUCCEEDED" page={1} jobId="abc" />);
    fireEvent.click(within(screen.getByTestId('job-result-card')).getByRole('button', { name: 'Close' }));
    expect(push).toHaveBeenCalledWith('/settings/activity?status=SUCCEEDED&page=1', { scroll: false });
  });

  it('a running job has Cancel and its progress', () => {
    jobs = [job({ id: 'r', status: 'RUNNING', result: null, finishedAt: null, progressNote: 'Syncing', progressTotal: null })];
    render(<ActivityPage {...props} jobId="r" />);
    const card = screen.getByTestId('job-result-card');
    fireEvent.click(within(card).getByRole('button', { name: 'Cancel' }));
    expect(cancel).toHaveBeenCalledWith('r');
    expect(within(card).getByText('Syncing')).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('a failed job has Retry and its error code and message open', () => {
    jobs = [job({ id: 'f', status: 'FAILED', result: null, errorCode: 'TOKEN_EXPIRED', errorMessage: 'Token expired' })];
    render(<ActivityPage {...props} jobId="f" />);
    const card = screen.getByTestId('job-result-card');
    expect(within(card).getByTestId('job-error-text')).toHaveTextContent('TOKEN_EXPIRED: Token expired');
    fireEvent.click(within(card).getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledWith('f');
    expect(within(card).queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('a cancelled job has Retry', () => {
    jobs = [job({ id: 'c', status: 'CANCELLED', result: null })];
    render(<ActivityPage {...props} jobId="c" />);
    const card = screen.getByTestId('job-result-card');
    expect(within(card).getByText('Cancelled by you')).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledWith('c');
  });

  it('a succeeded job has neither Cancel nor Retry', () => {
    jobs = [job({ id: 'abc' })];
    render(<ActivityPage {...props} jobId="abc" />);
    const card = screen.getByTestId('job-result-card');
    expect(within(card).queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(within(card).queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});
