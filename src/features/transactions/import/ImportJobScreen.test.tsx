import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { JobResponse } from '@/lib/types';

let current: JobResponse | null = null;
vi.mock('@/features/jobs/useJobStatusPolling', () => ({
  useJobStatusPolling: () => ({ job: current, isPolling: false, error: null }),
}));
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
let retried: ((job: { id: string }) => void) | undefined;
vi.mock('@/features/jobs/useJobMutations', () => ({
  useJobMutations: (o?: { onRetried?: (job: { id: string }) => void }) => {
    retried = o?.onRetried;
    return { cancel: vi.fn(), retry: () => retried?.({ id: 'new-job' }), busy: false };
  },
}));
vi.mock('@/features/shell/ShellPage', () => ({ ShellPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

import { ImportJobScreen } from './ImportJobScreen';

const NOW = new Date().toISOString();
const job = (over: Partial<JobResponse>): JobResponse =>
  ({ id: 'j1', type: 'STATEMENT_INGEST', status: 'SUCCEEDED', triggerSource: 'USER', cancelRequested: false, attempt: 1, createdAt: NOW, startedAt: NOW, finishedAt: NOW, ...over }) as JobResponse;

describe('ImportJobScreen', () => {
  it('shows a section per file with its counters, warnings and errors, and the duplicates banner', () => {
    current = job({
      result: {
        filesProcessed: 2,
        totalCreated: 3,
        totalDuplicatesFound: 1,
        fileDetails: [
          { filename: 'Amex.pdf', status: 'SUCCESS', linesParsed: 4, created: 3, duplicates: 1, errorMessage: null, warning: 'Closing balance differs' },
          { filename: 'Bad.pdf', status: 'FAILED', linesParsed: 0, errorMessage: 'Wrong password' },
        ],
      },
    });
    render(<ImportJobScreen jobId="j1" />);
    const sections = screen.getAllByTestId('import-file');
    expect(sections).toHaveLength(2);
    expect(within(sections[0]).getByText('Closing balance differs')).toBeInTheDocument();
    expect(within(sections[1]).getByText('Wrong password')).toBeInTheDocument();
    expect(within(sections[1]).getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('1 duplicate found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute('href', '/transactions');
    expect(screen.getByText('2 files')).toBeInTheDocument();
  });

  it('shows no duplicates banner when there are none', () => {
    current = job({
      result: { filesProcessed: 1, totalCreated: 2, totalDuplicatesFound: 0, fileDetails: [{ filename: 'a.pdf', status: 'SUCCESS', linesParsed: 2, created: 2, duplicates: 0, errorMessage: null }] },
    });
    render(<ImportJobScreen jobId="j1" />);
    expect(screen.queryByText(/duplicate/i, { selector: 'strong, b, p' })).not.toBeInTheDocument();
  });

  it('shows progress and Cancel while running, with no file sections', () => {
    current = job({ status: 'RUNNING', finishedAt: null, progressNote: 'Reading a.pdf', result: null });
    render(<ImportJobScreen jobId="j1" />);
    expect(screen.getByText('Reading a.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.queryByTestId('import-file')).not.toBeInTheDocument();
  });

  it('shows the error of a failed job with Retry', () => {
    current = job({ status: 'FAILED', result: null, errorCode: 'INGEST_FAILED', errorMessage: 'Could not read the file' });
    render(<ImportJobScreen jobId="j1" />);
    expect(screen.getByText(/Could not read the file/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('says Import failed when a failed job has no error text', () => {
    current = job({ status: 'FAILED', result: null });
    render(<ImportJobScreen jobId="j1" />);
    expect(screen.getByText('Import failed')).toBeInTheDocument();
  });

  it('opens the new import after Retry', () => {
    current = job({ status: 'FAILED', result: null, errorMessage: 'x' });
    render(<ImportJobScreen jobId="j1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(push).toHaveBeenCalledWith('/transactions/import/new-job');
  });

  it('names the account in the header and keeps same-named files as separate sections', () => {
    const f = { filename: 'a.pdf', status: 'SUCCESS' as const, linesParsed: 1, created: 1, duplicates: 0, errorMessage: null };
    current = job({ accountName: 'HDFC Regalia Gold', result: { filesProcessed: 2, totalCreated: 2, totalDuplicatesFound: 0, fileDetails: [f, f] } });
    render(<ImportJobScreen jobId="j1" />);
    expect(screen.getByText(/^HDFC Regalia Gold · started/)).toBeInTheDocument();
    expect(screen.getAllByTestId('import-file')).toHaveLength(2);
  });
});
