import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JobResponse } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { ConnectionsPage } from './ConnectionsPage';
import { RecentSyncJobsCard } from './RecentSyncJobsCard';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/ds/settings/connections',
  useSearchParams: () => new URLSearchParams(search),
}));

const gmail = {
  loading: null as string | null,
  connections: [] as unknown[],
  senders: [] as unknown[],
  attentionData: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 } as unknown,
  attentionPage: 0,
  setAttentionPage: vi.fn(),
  archivedData: null,
  archivedPage: 0,
  setArchivedPage: vi.fn(),
  message: null as { type: 'success' | 'error'; text: string } | null,
  dismissMessage: vi.fn(),
  isSyncing: false,
  isSenderDialogOpen: false,
  setIsSenderDialogOpen: vi.fn(),
  editingSender: null,
  submittingSender: false,
  senderName: '',
  setSenderName: vi.fn(),
  senderAddress: '',
  setSenderAddress: vi.fn(),
  senderEnabled: true,
  setSenderEnabled: vi.fn(),
  handleConnect: vi.fn(),
  handleDisconnect: vi.fn(),
  handleSync: vi.fn(),
  handleRetryAttentionItem: vi.fn(),
  handleArchiveAttentionItem: vi.fn(),
  handleUnarchiveAttentionItem: vi.fn(),
  openAddSenderDialog: vi.fn(),
  openEditSenderDialog: vi.fn(),
  handleSenderSubmit: vi.fn(),
  handleSenderDelete: vi.fn(),
};
vi.mock('./useGmailConnect', () => ({ useGmailConnect: () => gmail }));

let jobsState: { jobs: JobResponse[]; loading: boolean } = { jobs: [], loading: false };
const toggleExpand = vi.fn();
let expanded = new Set<string>();
vi.mock('@/features/jobs/useJobsListPolling', () => ({
  useJobsListPolling: () => ({ ...jobsState, expandedJobIds: expanded, toggleExpand }),
}));
vi.mock('@/features/jobs/useJobActions', () => ({ useJobActions: () => ({ cancel: vi.fn(), retry: vi.fn(), busy: false }) }));

const job = (over: Partial<JobResponse>) =>
  ({ id: 'j1', type: 'GMAIL_SYNC', status: 'SUCCEEDED', createdAt: new Date().toISOString(), ...over }) as JobResponse;

beforeEach(() => {
  vi.clearAllMocks();
  search = '';
  gmail.message = null;
  gmail.isSyncing = false;
  gmail.connections = [];
  jobsState = { jobs: [], loading: false };
  expanded = new Set();
});

describe('ConnectionsPage banners', () => {
  it('shows the success banner from the OAuth return, then clears the params', () => {
    search = 'gmail=success&email=a%40b.test&focus=attention';
    renderWithQuery(<ConnectionsPage oauth={{ kind: 'success', email: 'a@b.test' }} />);
    expect(screen.getByText('Successfully connected')).toBeInTheDocument();
    expect(screen.getByText('a@b.test')).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/ds/settings/connections?focus=attention');
  });

  it('shows the error banner with its message, and the fallback without one', () => {
    const { unmount } = renderWithQuery(<ConnectionsPage oauth={{ kind: 'error', message: 'Google did not grant access' }} />);
    expect(screen.getByText('Connection error')).toBeInTheDocument();
    expect(screen.getByText('Google did not grant access')).toBeInTheDocument();
    unmount();
    renderWithQuery(<ConnectionsPage oauth={{ kind: 'error' }} />);
    expect(screen.getByText('An unexpected error occurred during Google authorization.')).toBeInTheDocument();
  });

  it('dismisses the OAuth banner', () => {
    renderWithQuery(<ConnectionsPage oauth={{ kind: 'error', message: 'nope' }} />);
    fireEvent.click(screen.getByRole('button', { name: /close|dismiss/i }));
    expect(screen.queryByText('Connection error')).toBeNull();
  });

  it('shows no banner and leaves the URL alone without params', () => {
    renderWithQuery(<ConnectionsPage oauth={null} />);
    expect(screen.queryByText('Connection error')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows an in-page failure as a dismissible banner', () => {
    gmail.message = { type: 'error', text: 'Failed to sync Gmail' };
    renderWithQuery(<ConnectionsPage oauth={null} />);
    expect(screen.getByText('Failed to sync Gmail')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close|dismiss/i }));
    expect(gmail.dismissMessage).toHaveBeenCalled();
  });
});

describe('ConnectionsPage sync', () => {
  it('Sync now starts the sync flow, and is busy while a job is active', () => {
    gmail.connections = [{ id: 'c1', email: 'a@b.test', isPrimary: true, needsReconnect: false }];
    const { unmount } = renderWithQuery(<ConnectionsPage oauth={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    expect(gmail.handleSync).toHaveBeenCalledTimes(1);
    unmount();
    gmail.isSyncing = true;
    renderWithQuery(<ConnectionsPage oauth={null} />);
    expect(screen.getByRole('button', { name: /Syncing/ })).toBeDisabled();
  });

  it('puts the sender dialog behind Add sender', () => {
    renderWithQuery(<ConnectionsPage oauth={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add sender' }));
    expect(gmail.openAddSenderDialog).toHaveBeenCalled();
  });
});

describe('RecentSyncJobsCard', () => {
  it('shows loading and empty copy', () => {
    jobsState = { jobs: [], loading: true };
    const { unmount } = renderWithQuery(<RecentSyncJobsCard />);
    expect(screen.getByText('Loading jobs…')).toBeInTheDocument();
    unmount();
    jobsState = { jobs: [], loading: false };
    renderWithQuery(<RecentSyncJobsCard />);
    expect(screen.getByText('No recent sync jobs yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/ds/settings/activity?type=GMAIL_SYNC');
  });

  it('shows the Live badge only while a job is pending or running', () => {
    jobsState = { jobs: [job({ status: 'RUNNING', progressNote: 'Reading 3 of 8 emails', progressCurrent: 3, progressTotal: 8 })], loading: false };
    const { unmount } = renderWithQuery(<RecentSyncJobsCard />);
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Reading 3 of 8 emails')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    unmount();
    jobsState = { jobs: [job({})], loading: false };
    renderWithQuery(<RecentSyncJobsCard />);
    expect(screen.queryByText('Live')).toBeNull();
  });

  it('expands a finished job from the chevron and shows its result', () => {
    jobsState = { jobs: [job({ result: { created: 2, reconciled: 0, skipped: 0, fetched: 2, failed: 0 } })], loading: false };
    const { unmount } = renderWithQuery(<RecentSyncJobsCard />);
    expect(screen.queryByText('Gmail sync summary')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expand details' }));
    expect(toggleExpand).toHaveBeenCalledWith('j1');
    unmount();
    expanded = new Set(['j1']);
    renderWithQuery(<RecentSyncJobsCard />);
    expect(screen.getByText('Gmail sync summary')).toBeInTheDocument();
  });

  it('shows error details and Retry for a failed job', () => {
    jobsState = { jobs: [job({ status: 'FAILED', errorCode: 'GMAIL_AUTH', errorMessage: 'Token expired' })], loading: false };
    expanded = new Set(['j1']);
    renderWithQuery(<RecentSyncJobsCard />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /Error details \(GMAIL_AUTH\)/ }));
    expect(screen.getByTestId('job-error-text')).toHaveTextContent('Token expired');
  });
});
