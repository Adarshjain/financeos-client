import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import * as jobsActions from '@/actions/jobs';

import { JobErrorDetails } from '../JobErrorDetails';
import { JobsPanel } from '../JobsPanel';
import { JobStatusPill } from '../JobStatusPill';
import { formatDuration } from '../jobUtils';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock('@/actions/jobs', () => ({
  listJobs: vi.fn(),
  retryJob: vi.fn(),
  cancelJob: vi.fn(),
}));

vi.mock('@/components/jobs/JobsProvider', () => ({
  useJobs: () => ({ activeJobs: [], notifyJobStarted: vi.fn() }),
  getJobTypeLabel: (type: string) => type,
}));

describe('Shared Job Components', () => {
  it('renders JobStatusPill correctly for different statuses', () => {
    const { rerender } = render(<JobStatusPill status="PENDING" />);
    expect(screen.getByText('PENDING')).toBeInTheDocument();

    rerender(<JobStatusPill status="RUNNING" />);
    expect(screen.getByText('RUNNING')).toBeInTheDocument();

    rerender(<JobStatusPill status="SUCCEEDED" />);
    expect(screen.getByText('SUCCEEDED')).toBeInTheDocument();

    rerender(<JobStatusPill status="FAILED" />);
    expect(screen.getByText('FAILED')).toBeInTheDocument();

    rerender(<JobStatusPill status="CANCELLED" />);
    expect(screen.getByText('CANCELLED')).toBeInTheDocument();
  });

  it('formats durations properly in formatDuration', () => {
    expect(formatDuration(null, null)).toBe('-');
    const now = Date.now();
    expect(formatDuration(new Date(now - 500).toISOString(), new Date(now).toISOString())).toBe('500ms');
    expect(formatDuration(new Date(now - 5000).toISOString(), new Date(now).toISOString())).toBe('5s');
    expect(formatDuration(new Date(now - 65000).toISOString(), new Date(now).toISOString())).toBe('1m 5s');
  });

  it('toggles JobErrorDetails on button click', () => {
    render(<JobErrorDetails errorCode="INVALID_FILE" errorMessage="File corrupt" />);
    const button = screen.getByText(/Error details/i);
    expect(button).toBeInTheDocument();
    expect(screen.queryByText(/File corrupt/i)).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.getByText(/File corrupt/i)).toBeInTheDocument();
  });
});

describe('JobsPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and renders jobs list with title', async () => {
    (jobsActions.listJobs as any).mockResolvedValue({
      success: true,
      data: {
        content: [
          {
            id: 'job-1',
            type: 'STATEMENT_INGEST',
            status: 'SUCCEEDED',
            createdAt: '2026-08-21T10:00:00Z',
            startedAt: '2026-08-21T10:00:00Z',
            finishedAt: '2026-08-21T10:00:05Z',
            result: { filesProcessed: 1, totalCreated: 5, totalDuplicatesFound: 0, fileDetails: [] },
          },
        ],
      },
    });

    render(<JobsPanel types={['STATEMENT_INGEST']} title="Recent statement ingestion jobs" />);

    expect(screen.getByText('Loading jobs…')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Recent statement ingestion jobs')).toBeInTheDocument();
      expect(screen.getByText('SUCCEEDED')).toBeInTheDocument();
    });
  });

  it('shows empty state when no jobs returned', async () => {
    (jobsActions.listJobs as any).mockResolvedValue({
      success: true,
      data: { content: [] },
    });

    render(<JobsPanel types={['GMAIL_SYNC']} title="Recent sync jobs" />);

    await waitFor(() => {
      expect(screen.getByText(/No recent sync jobs yet/i)).toBeInTheDocument();
    });
  });
});
