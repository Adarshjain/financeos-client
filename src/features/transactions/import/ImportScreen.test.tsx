import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JobResponse } from '@/lib/types';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/ds/transactions/import' }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/features/shell/ShellPage', () => ({
  ShellPage: ({ children, onAdd, addLabel }: { children: React.ReactNode; onAdd?: () => void; addLabel?: string }) => (
    <div>
      {onAdd ? <button onClick={onAdd}>{addLabel ?? 'Add'}</button> : null}
      {children}
    </div>
  ),
}));
vi.mock('@/features/transactions/form/AddTransactionProvider', () => ({ useAddTransaction: () => ({ open: vi.fn() }) }));
vi.mock('@/lib/query', () => ({ useAccounts: (a: unknown) => ({ data: a }) }));
vi.mock('@/features/jobs/jobsBus', () => ({ subscribeJobStarted: () => () => {} }));
vi.mock('@/features/jobs/useJobActions', () => ({ useJobActions: () => ({ cancel: vi.fn(), retry: vi.fn(), busy: false }) }));

let jobs: JobResponse[] = [];
let totalPages = 1;
vi.mock('@/features/jobs/useJobsHistory', () => ({ useJobsHistory: () => ({ jobs, isPending: false, totalElements: jobs.length, totalPages }) }));

const handleSubmit = vi.fn((e?: React.FormEvent) => e?.preventDefault());
const clearAllFiles = vi.fn();
const addFiles = vi.fn();
let form: Record<string, unknown> = {};
vi.mock('./useIngestForm', () => ({ useIngestForm: () => form }));

import { ImportScreen } from './ImportScreen';

const accounts = [{ id: 'a1', name: 'HDFC Regalia Gold', type: 'credit_card', warnings: [] }] as never;
const NOW = new Date().toISOString();
const running = {
  id: 'j9', type: 'STATEMENT_INGEST', status: 'RUNNING', triggerSource: 'USER', cancelRequested: false, attempt: 1,
  createdAt: NOW, progressNote: 'Reading Regalia-Gold-Oct.pdf', progressCurrent: 1, progressTotal: 2, result: null,
} as JobResponse;
const file = (name: string) => new File(['x'], name, { type: 'application/pdf' });

beforeEach(() => {
  jobs = [];
  totalPages = 1;
  push.mockClear();
  form = {
    selectedAccountId: 'a1', setSelectedAccountId: vi.fn(), files: [file('Oct.pdf'), file('Sep.pdf')], isUploading: false, isSending: false,
    uploadableAccounts: accounts, addFiles, removeFile: vi.fn(), clearAllFiles, handleSubmit,
  };
  handleSubmit.mockClear();
  clearAllFiles.mockClear();
});

describe('ImportScreen', () => {
  it('queues files, names the upload button by their count and submits the form', () => {
    render(<ImportScreen initialAccounts={accounts} since="2026-09-22T18:30:00.000Z" />);
    expect(screen.getByText('Oct.pdf')).toBeInTheDocument();
    const upload = screen.getByRole('button', { name: 'Upload & process 2 files' });
    expect(upload).toBeEnabled();
    fireEvent.submit(screen.getByTestId('import-form'));
    expect(handleSubmit).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(clearAllFiles).toHaveBeenCalled();
  });

  it('disables Upload with no account or no files', () => {
    form = { ...form, files: [] };
    render(<ImportScreen initialAccounts={accounts} since="2026-09-22T18:30:00.000Z" />);
    expect(screen.getByRole('button', { name: 'Upload & process' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });

  it('locks the form while an import runs, with the running import as the top row with its bar', () => {
    form = { ...form, isUploading: true, isSending: false };
    jobs = [running];
    render(<ImportScreen initialAccounts={accounts} since="2026-09-22T18:30:00.000Z" />);
    expect(screen.getByRole('button', { name: /Processing statements/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Choose files/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Remove Oct.pdf/ })).toBeDisabled();
    expect(screen.getAllByText('Reading Regalia-Gold-Oct.pdf').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
  });

  it('says Uploading files while the upload itself is sent', () => {
    form = { ...form, isUploading: true, isSending: true };
    render(<ImportScreen initialAccounts={accounts} since="2026-09-22T18:30:00.000Z" />);
    expect(screen.getByRole('button', { name: /Uploading files/ })).toBeDisabled();
  });

  it('links the tabs, Activity filtered to imports, and each import', () => {
    jobs = [{ ...running, status: 'SUCCEEDED', result: { filesProcessed: 1, totalCreated: 1, totalDuplicatesFound: 0, fileDetails: [{ filename: 'a.pdf', status: 'SUCCESS', linesParsed: 1, created: 1, duplicates: 0, errorMessage: null }] } }];
    render(<ImportScreen initialAccounts={accounts} since="2026-09-22T18:30:00.000Z" />);
    expect(screen.getByRole('tab', { name: 'Import' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('link', { name: 'Activity' })).toHaveAttribute('href', '/ds/settings/activity?type=STATEMENT_INGEST');
    expect(screen.getAllByRole('link', { name: 'View' })[0]).toHaveAttribute('href', '/ds/transactions/import/j9');
  });

  it('stays locked when the history already has a running import (reload, second tab)', () => {
    jobs = [running];
    render(<ImportScreen initialAccounts={accounts} since="2026-09-22T18:30:00.000Z" />);
    expect(screen.getByRole('button', { name: /Processing statements/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Choose files/ })).toBeDisabled();
  });

  it('says Last 30 days over Recent imports', () => {
    render(<ImportScreen initialAccounts={accounts} since="2026-09-22T18:30:00.000Z" />);
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  it('the app bar + opens the file picker', () => {
    render(<ImportScreen initialAccounts={accounts} since="2026-09-22T18:30:00.000Z" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Add statements' }));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('the app bar + does nothing while an import runs (the picker is disabled)', () => {
    jobs = [running];
    render(<ImportScreen initialAccounts={accounts} since="2026-09-22T18:30:00.000Z" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add statements' }));
    expect(screen.getByRole('button', { name: /Processing statements/ })).toBeDisabled();
  });

  it('pages Recent imports through the address, keeping the account', () => {
    totalPages = 3;
    jobs = [{ ...running, status: 'SUCCEEDED' } as JobResponse];
    render(<ImportScreen initialAccounts={accounts} initialAccountId="a1" since="2026-09-22T18:30:00.000Z" page={1} />);
    expect(screen.getAllByRole('button', { name: 'Page 3' }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Page 3' })[0]);
    expect(push).toHaveBeenCalledWith('/ds/transactions/import?account=a1&page=2', { scroll: false });
  });

  it('draws no pager for a single page', () => {
    jobs = [{ ...running, status: 'SUCCEEDED' } as JobResponse];
    render(<ImportScreen initialAccounts={accounts} since="2026-09-22T18:30:00.000Z" />);
    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument();
  });
});
