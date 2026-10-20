import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/lib/account.types';

vi.mock('@/components/jobs/JobsPanel', () => ({ JobsPanel: () => null }));
vi.mock('@/lib/query', () => ({ useAccounts: (initial: Account[]) => ({ data: initial }) }));

let state = { isUploading: false, isSending: false };
vi.mock('../components/useIngestForm', () => ({
  useIngestForm: () => ({
    selectedAccountId: 'acc-1',
    setSelectedAccountId: vi.fn(),
    files: [new File(['%PDF'], 'apr.pdf')],
    isDragActive: false,
    uploadableAccounts: [],
    handleDragOver: vi.fn(),
    handleDragLeave: vi.fn(),
    handleDrop: vi.fn(),
    handleFileChange: vi.fn(),
    removeFile: vi.fn(),
    clearAllFiles: vi.fn(),
    handleSubmit: vi.fn(),
    ...state,
  }),
}));

import { IngestForm } from '../IngestForm';

describe('IngestForm submit button', () => {
  beforeEach(() => {
    state = { isUploading: false, isSending: false };
  });

  it('is ready to upload when idle', () => {
    render(<IngestForm initialAccounts={[]} />);
    expect(screen.getByRole('button', { name: 'Upload & Process Statements' })).toBeEnabled();
  });

  it('shows the upload phase while the files are being sent', () => {
    state = { isUploading: true, isSending: true };
    render(<IngestForm initialAccounts={[]} />);
    expect(screen.getByRole('button', { name: 'Uploading files…' })).toBeDisabled();
  });

  it('shows the processing phase while the background job runs', () => {
    state = { isUploading: true, isSending: false };
    render(<IngestForm initialAccounts={[]} />);
    expect(screen.getByRole('button', { name: 'Processing statements…' })).toBeDisabled();
  });
});
