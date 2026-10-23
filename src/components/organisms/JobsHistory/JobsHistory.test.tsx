import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { JobResponse } from '@/lib/types';

import { JobsHistory } from './JobsHistory';

const NOW = new Date().toISOString();
const ingest = (over: Partial<JobResponse>, files: object[] = [{ filename: 'HDFC-savings.pdf', status: 'SUCCESS', linesParsed: 12, created: 12, duplicates: 0, errorMessage: null }]): JobResponse =>
  ({
    id: 'j1',
    type: 'STATEMENT_INGEST',
    status: 'SUCCEEDED',
    triggerSource: 'USER',
    cancelRequested: false,
    attempt: 1,
    createdAt: NOW,
    startedAt: NOW,
    finishedAt: NOW,
    result: { filesProcessed: files.length, totalCreated: 12, totalDuplicatesFound: 0, fileDetails: files },
    ...over,
  }) as JobResponse;

const base = { openHref: (j: JobResponse) => `/ds/transactions/import/${j.id}` };

describe('JobsHistory compact', () => {
  it('names the job by its file, leads with a status word and links View', () => {
    render(<JobsHistory compact jobs={[ingest({})]} {...base} />);
    expect(screen.getAllByText('HDFC-savings.pdf').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Done').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12 rows · 12 new/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'View' })[0]).toHaveAttribute('href', '/ds/transactions/import/j1');
  });

  it('says how many warnings a finished import has, and Failed for a failed one', () => {
    const warned = ingest({ id: 'w' }, [{ filename: 'Amex.pdf', status: 'SUCCESS', linesParsed: 4, created: 3, duplicates: 1, errorMessage: null, warning: 'row dated after the statement' }]);
    const failed = ingest({ id: 'f', status: 'FAILED', result: null, errorMessage: 'Wrong password' });
    render(<JobsHistory compact jobs={[warned, failed]} {...base} />);
    expect(screen.getAllByText('1 warning').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Wrong password/).length).toBeGreaterThan(0);
  });

  it('shows a progress bar and its note on a running job instead of a status line', () => {
    const running = ingest({ status: 'RUNNING', result: null, progressNote: 'Reading page 2', progressCurrent: 1, progressTotal: 4 });
    render(<JobsHistory compact jobs={[running]} {...base} />);
    expect(screen.getAllByText('Reading page 2').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('reports a row press and shows the empty node', () => {
    const onOpen = vi.fn();
    const { rerender } = render(<JobsHistory compact jobs={[ingest({})]} onOpen={onOpen} {...base} />);
    fireEvent.click(screen.getAllByText('HDFC-savings.pdf')[0]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'j1' }));
    rerender(<JobsHistory compact jobs={[]} empty={<p>No imports</p>} {...base} />);
    expect(screen.getByText('No imports')).toBeInTheDocument();
  });
});

describe('JobsHistory compact, finished with failed files', () => {
  const failedFile = { filename: 'Bad.pdf', status: 'FAILED', linesParsed: 0, errorMessage: 'Wrong password' };
  const okFile = { filename: 'ok.pdf', status: 'SUCCESS', linesParsed: 2, created: 2, duplicates: 0, errorMessage: null };

  it('says Failed when every file failed, even though the job succeeded', () => {
    render(<JobsHistory compact jobs={[ingest({}, [failedFile, { ...failedFile, filename: 'Bad2.pdf' }])]} {...base} />);
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('says how many failed when only some did', () => {
    render(<JobsHistory compact jobs={[ingest({}, [okFile, failedFile])]} {...base} />);
    expect(screen.getAllByText('1 failed').length).toBeGreaterThan(0);
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });
});

describe('JobsHistory full', () => {
  it('has the Job, Started, Took, Result and Status columns', () => {
    render(<JobsHistory jobs={[ingest({})]} {...base} />);
    for (const h of ['Job', 'Started', 'Took', 'Result', 'Status']) expect(screen.getByText(h)).toBeInTheDocument();
    expect(screen.getAllByText('Succeeded').length).toBeGreaterThan(0);
  });
});
