import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JobResponse } from '@/lib/types';

let current: JobResponse | null = null;
vi.mock('@/features/jobs/useJobStatusPolling', () => ({
  useJobStatusPolling: () => ({ job: current, isPolling: false, error: null }),
}));
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/features/jobs/useJobMutations', () => ({ useJobMutations: () => ({ cancel: vi.fn(), retry: vi.fn(), busy: false }) }));
vi.mock('@/features/jobs/jobsBus', () => ({ emitJobStarted: vi.fn() }));
vi.mock('@/features/shell/ShellPage', () => ({ ShellPage: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('./importActions', () => ({ retryFileWithPassword: vi.fn() }));

import { retryFileWithPassword } from './importActions';
import { ImportJobScreen } from './ImportJobScreen';

const NOW = new Date().toISOString();
const withFiles = (fileDetails: unknown[]) => {
  current = {
    id: 'j1', type: 'STATEMENT_INGEST', status: 'SUCCEEDED', triggerSource: 'USER', cancelRequested: false, attempt: 1,
    createdAt: NOW, startedAt: NOW, finishedAt: NOW,
    result: { filesProcessed: fileDetails.length, totalCreated: 0, totalDuplicatesFound: 0, fileDetails },
  } as unknown as JobResponse;
};
const locked = { filename: 'Locked.pdf', status: 'FAILED', linesParsed: 0, errorMessage: 'Password required', errorCode: 'PASSWORD_REQUIRED' };
const submit = (pw: string) => {
  fireEvent.change(screen.getByLabelText('Statement password'), { target: { value: pw } });
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
};

beforeEach(() => vi.clearAllMocks());

describe('ImportJobScreen password retry', () => {
  it('retries the file with the password, saving it by default, and opens the new job', async () => {
    withFiles([{ filename: 'Ok.pdf', status: 'SUCCESS', linesParsed: 1 }, locked]);
    vi.mocked(retryFileWithPassword).mockResolvedValue({ success: true, data: { id: 'j2' } } as never);
    render(<ImportJobScreen jobId="j1" />);
    expect(screen.getAllByLabelText('Statement password')).toHaveLength(1);
    submit('secret');
    await waitFor(() => expect(retryFileWithPassword).toHaveBeenCalledWith('j1', 1, 'secret', true));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/transactions/import/j2'));
  });

  it('passes saveToAccount false when unchecked', async () => {
    withFiles([locked]);
    vi.mocked(retryFileWithPassword).mockResolvedValue({ success: true, data: { id: 'j2' } } as never);
    render(<ImportJobScreen jobId="j1" />);
    fireEvent.click(screen.getByRole('checkbox'));
    submit('secret');
    await waitFor(() => expect(retryFileWithPassword).toHaveBeenCalledWith('j1', 0, 'secret', false));
  });

  it('says the password did not work on WRONG_PASSWORD', async () => {
    withFiles([locked]);
    vi.mocked(retryFileWithPassword).mockResolvedValue({ success: false, status: 422, error: { code: 'WRONG_PASSWORD', message: 'x' } } as never);
    render(<ImportJobScreen jobId="j1" />);
    submit('nope');
    expect(await screen.findByText("That password didn't work.")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('shows the server message on 409', async () => {
    withFiles([locked]);
    vi.mocked(retryFileWithPassword).mockResolvedValue({
      success: false, status: 409, error: { code: 'FILE_EXPIRED', message: 'The file is no longer stored. Upload it again.' },
    } as never);
    render(<ImportJobScreen jobId="j1" />);
    submit('secret');
    expect(await screen.findByText('The file is no longer stored. Upload it again.')).toBeInTheDocument();
  });

  it('opens with the wrong-password message for a WRONG_PASSWORD file', () => {
    withFiles([{ ...locked, errorCode: 'WRONG_PASSWORD' }]);
    render(<ImportJobScreen jobId="j1" />);
    expect(screen.getByText("That password didn't work.")).toBeInTheDocument();
  });

  it('links a held file to its place on the import page', () => {
    withFiles([{ filename: 'Held.pdf', status: 'HELD', linesParsed: 0, errorMessage: null, heldUploadId: 'h9' }]);
    render(<ImportJobScreen jobId="j1" />);
    expect(screen.getByText('Needs an account', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pick an account' })).toHaveAttribute('href', '/transactions/import?held=h9');
  });

  it('shows loading while retrying and ignores a second submit; works again after an error', async () => {
    withFiles([locked]);
    let resolve!: (v: unknown) => void;
    vi.mocked(retryFileWithPassword).mockReturnValueOnce(new Promise((r) => { resolve = r; }) as never);
    render(<ImportJobScreen jobId="j1" />);
    submit('secret');
    const btn = screen.getByRole('button', { name: /Try again/ });
    await waitFor(() => expect(btn).toBeDisabled());
    fireEvent.submit(btn.closest('form')!);
    expect(retryFileWithPassword).toHaveBeenCalledTimes(1);
    resolve({ success: false, status: 409, error: { code: 'X', message: 'Nope.' } });
    expect(await screen.findByText('Nope.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled());
  });
});
