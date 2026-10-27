import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api/client';
import { DiagnosticsProvider } from '@/lib/diagnostics/DiagnosticsProvider';
import { errorLog } from '@/lib/diagnostics/errorLog';
import { renderWithQuery } from '@/test/renderWithQuery';

import { DebugView } from './DebugView';
import { LocalFailuresCard } from './LocalFailuresCard';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn() } };
});

vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/settings/debug',
  useSearchParams: () => new URLSearchParams(),
}));

const at = '2026-10-13T08:08:49.101Z';
const lookup = {
  ref: 'HM6HK5G6',
  refType: 'errorId',
  requestId: 'f80e0834c4af440681b0',
  errorId: 'HM6HK5G6',
  found: true,
  truncated: false,
  rawAvailable: true,
  request: {
    method: 'POST',
    route: '/api/v1/reports',
    status: 400,
    durationMs: 18,
    at,
    userEmail: 'arjun@example.test',
    version: '1.0.0-ec1bc48',
    slow: true,
  },
  rootCause: {
    kind: 'CLIENT_REJECTED',
    headline: 'Validation failed',
    detail: 'The filter uses an operator the field does not support',
    exceptionClass: 'ValidationException',
    oraCode: 'ORA-00001',
    rootFrame: 'ReportDefinitionValidator.validate',
    hints: ['Check the operator'],
  },
  timeline: [
    { at, level: 'INFO', source: 'server', message: 'POST /api/v1/reports', event: 'http', fields: {} },
    { at, level: 'ERROR', source: 'server', message: 'Operator not valid', fields: { datasource: 'tx' }, stackTrace: 'at Foo.bar(Foo.java:1)' },
  ],
};

function mockLookup(data: unknown, error?: unknown) {
  vi.mocked(api.GET).mockResolvedValue({ data, error, response: new Response() } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  errorLog.setOwner('user-test');
  errorLog.clear();
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  Object.assign(navigator, { share: undefined });
});

describe('DebugView lookup', () => {
  it('non-admin sees the admin note, no form, and never calls the API', () => {
    renderWithQuery(<DebugView admin={false} initialRef="HM6HK5G6" />);
    expect(screen.getByText('Look-ups are for admins. Send the reference to the developer.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Look up' })).not.toBeInTheDocument();
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('admin sees the form with the hint, type options and a disabled Look up when empty', () => {
    renderWithQuery(<DebugView admin />);
    expect(screen.getByText(/Enter a request id or an error id/)).toBeInTheDocument();
    for (const name of ['Auto-detect', 'Error ID', 'Request ID']) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Look up' })).toBeDisabled();
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('submitting trims the ref and writes ref and type to the URL', async () => {
    mockLookup(lookup);
    renderWithQuery(<DebugView admin />);
    fireEvent.change(screen.getByLabelText('Reference'), { target: { value: '  HM6HK5G6 ' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Error ID' }));
    fireEvent.click(screen.getByRole('button', { name: 'Look up' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/settings/debug?ref=HM6HK5G6&type=errorId'));
    expect(api.GET).toHaveBeenCalledWith('/api/v1/diagnostics/lookup', {
      params: { query: { ref: 'HM6HK5G6', type: 'errorId' } },
    });
  });

  it('renders the request, root cause and timeline cards', async () => {
    mockLookup(lookup);
    renderWithQuery(<DebugView admin initialRef="HM6HK5G6" />);
    expect(await screen.findByText('Request')).toBeInTheDocument();
    expect(screen.getByText('f80e0834c4af440681b0')).toBeInTheDocument();
    expect(screen.getByText('400')).toBeInTheDocument();
    expect(screen.getByText('Slow')).toBeInTheDocument();
    expect(screen.getByText('13 Oct 1:38:49 pm IST')).toBeInTheDocument();
    expect(screen.getAllByText('POST /api/v1/reports').length).toBeGreaterThan(0);
    expect(screen.getByText('arjun@example.test')).toBeInTheDocument();
    expect(screen.getByText('1.0.0-ec1bc48')).toBeInTheDocument();
    expect(screen.getByText('Root cause')).toBeInTheDocument();
    expect(screen.getByText('ReportDefinitionValidator.validate')).toBeInTheDocument();
    expect(screen.getByText(/The filter uses an operator/)).toBeInTheDocument();
    expect(screen.getByText('ORA-00001')).toBeInTheDocument();
    expect(screen.getByText('Check the operator')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText(/Operator not valid/)).toBeInTheDocument();
  });

  it('expands a timeline line to its fields and stack trace', async () => {
    mockLookup(lookup);
    renderWithQuery(<DebugView admin initialRef="HM6HK5G6" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Show details' }));
    expect(screen.getByText('datasource: tx')).toBeInTheDocument();
    expect(screen.getByText('at Foo.bar(Foo.java:1)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide details' }));
    expect(screen.queryByText('at Foo.bar(Foo.java:1)')).not.toBeInTheDocument();
  });

  it('shows the truncated note', async () => {
    mockLookup({ ...lookup, truncated: true });
    renderWithQuery(<DebugView admin initialRef="HM6HK5G6" />);
    expect(await screen.findByText('Truncated to first 500 lines')).toBeInTheDocument();
  });

  it('Copy raw fetches the raw endpoint and copies JSON; failure toasts an error', async () => {
    mockLookup(lookup);
    renderWithQuery(<DebugView admin initialRef="HM6HK5G6" />);
    const raw = [{ line: 'x' }];
    vi.mocked(api.GET).mockResolvedValueOnce({ data: raw, error: undefined, response: new Response() } as never);
    fireEvent.click(await screen.findByRole('button', { name: 'Copy raw' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Raw log entries copied to clipboard'));
    expect(api.GET).toHaveBeenLastCalledWith('/api/v1/diagnostics/lookup/raw', {
      params: { query: { ref: 'HM6HK5G6', type: 'auto' } },
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify(raw, null, 2));

    vi.mocked(api.GET).mockResolvedValueOnce({ data: undefined, error: new Error('x'), response: new Response() } as never);
    fireEvent.click(screen.getByRole('button', { name: 'Copy raw' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to fetch raw log lines'));
  });

  it('shows the error message when the look-up fails', async () => {
    mockLookup(undefined, new Error('Loki credentials lack read scope.'));
    renderWithQuery(<DebugView admin initialRef="HM6HK5G6" />);
    expect(await screen.findByText('Look-up failed')).toBeInTheDocument();
    expect(screen.getByText(/Loki credentials lack read scope/)).toBeInTheDocument();
  });

  it('shows the not-found root cause for an unknown reference without a request card', async () => {
    mockLookup({
      ...lookup,
      found: false,
      request: undefined,
      timeline: [],
      rootCause: { kind: 'NOT_FOUND_IN_LOGS', headline: 'Nothing found for this reference', detail: '', hints: ['Check the id'] },
    });
    renderWithQuery(<DebugView admin initialRef="ZZZZZZZZ" />);
    expect(await screen.findByText('Nothing found for this reference')).toBeInTheDocument();
    expect(screen.getByText('Check the id')).toBeInTheDocument();
    expect(screen.queryByText('Request')).not.toBeInTheDocument();
    expect(screen.queryByText('Timeline')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy raw' })).not.toBeInTheDocument();
  });

  it('tapping a local failure fills the lookup, updates the URL and highlights the row (admin)', async () => {
    mockLookup(lookup);
    errorLog.record('Validation error', { ref: 'HM6HK5G6', status: 400, code: 'VALIDATION_ERROR' });
    renderWithQuery(<DebugView admin />);
    fireEvent.click(screen.getByText('HM6HK5G6'));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/settings/debug?ref=HM6HK5G6'));
    expect(screen.getByLabelText('Reference')).toHaveValue('HM6HK5G6');
  });

  it('tapping a local failure as a non-admin copies it without calling the API', () => {
    errorLog.record('Validation error', { ref: 'HM6HK5G6', status: 400, code: 'VALIDATION_ERROR' });
    renderWithQuery(<DebugView admin={false} />);
    fireEvent.click(screen.getByText('HM6HK5G6'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('HM6HK5G6');
    expect(api.GET).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('LocalFailuresCard', () => {
  it('shows today\'s empty text and no actions when empty', () => {
    render(<LocalFailuresCard />);
    expect(screen.getByText('No local failures recorded in this browser session.')).toBeInTheDocument();
    expect(screen.getByText('Recent failures on this device · 0')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy all' })).not.toBeInTheDocument();
  });

  it('lists rows with reference and method, route, status and time', () => {
    errorLog.record('Account creation failed', {
      ref: 'E2EERR01',
      status: 500,
      code: 'INTERNAL_ERROR',
      method: 'POST',
      endpoint: '/api/v1/accounts',
    });
    render(<LocalFailuresCard highlightRef="E2EERR01" />);
    expect(screen.getByText('Recent failures on this device · 1')).toBeInTheDocument();
    expect(screen.getByText('E2EERR01')).toBeInTheDocument();
    expect(screen.getByText(/POST \/api\/v1\/accounts · 500 · /)).toBeInTheDocument();
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('tapping a row copies the ref, toasts and calls onSelectRef', () => {
    const onSelectRef = vi.fn();
    errorLog.record('Validation error', { ref: 'VAL12345', status: 400, code: 'VALIDATION_ERROR' });
    render(<LocalFailuresCard onSelectRef={onSelectRef} />);
    fireEvent.click(screen.getByText('VAL12345'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('VAL12345');
    expect(toast.success).toHaveBeenCalledWith('Copied ref VAL12345');
    expect(onSelectRef).toHaveBeenCalledWith('VAL12345');
  });

  it('Copy all copies the report with page request id and records', () => {
    errorLog.record('Database timeout', {
      ref: 'DB_ERR_1',
      status: 500,
      code: 'INTERNAL_ERROR',
      method: 'POST',
      endpoint: '/api/v1/accounts',
    });
    render(
      <DiagnosticsProvider pageRequestId="page-req-test" userId="user-test">
        <LocalFailuresCard />
      </DiagnosticsProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copy all' }));
    const text = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0];
    expect(text).toContain('=== FinanceOS Diagnostics Report ===');
    expect(text).toContain('Page Request ID: page-req-test');
    expect(text).toContain('DB_ERR_1 | HTTP 500 (INTERNAL_ERROR) | POST /api/v1/accounts | Database timeout');
    expect(toast.success).toHaveBeenCalledWith('Diagnostics report copied to clipboard');
  });

  it('Share uses navigator.share when available', () => {
    errorLog.record('Some error', { ref: 'REF_SHARE_1' });
    const share = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { share });
    render(<LocalFailuresCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'FinanceOS Diagnostics Report' }));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('Share falls back to the clipboard when unavailable or rejected', async () => {
    errorLog.record('Some error', { ref: 'REF_SHARE_1' });
    Object.assign(navigator, { share: vi.fn().mockRejectedValue(new Error('dismissed')) });
    render(<LocalFailuresCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Diagnostics report copied to clipboard'));
  });

  it('Clear empties the log and toasts', () => {
    errorLog.record('Error to clear', { ref: 'REF_CLR_1' });
    render(<LocalFailuresCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(errorLog.getSnapshot().length).toBe(0);
    expect(screen.getByText('No local failures recorded in this browser session.')).toBeInTheDocument();
    expect(toast.info).toHaveBeenCalledWith('Local error history cleared');
  });
});
