import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn() } };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { TimelineList } from '@/app/(protected)/debug/TimelineList';
import { api } from '@/lib/api/client';
import type { DiagnosticsLookupResponse } from '@/lib/api/types';

describe('TimelineList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  const mockTimeline = [
    {
      at: '2026-09-01T12:00:00.000Z',
      source: 'server',
      level: 'ERROR',
      event: 'request.failed',
      logger: 'com.financeos.GlobalExceptionHandler',
      message: 'Unexpected 5xx: errorId=E2EERR01',
      fields: { errorId: 'E2EERR01', status: 500 } as never,
      stackTrace: 'org.hibernate.AssertionFailure: null identifier\n\tat com.financeos.Test.run()',
    },
    {
      at: '2026-09-01T12:00:00.100Z',
      source: 'client',
      level: 'WARN',
      message: 'Client warning line without details',
      fields: {} as never,
    },
    {
      at: '2026-09-01T12:00:00.200Z',
      source: 'faro',
      level: 'INFO',
      message: 'Faro session event',
      fields: {} as never,
    },
  ] as unknown as DiagnosticsLookupResponse['timeline'];

  it('renders level and source badges for server, client, and faro', () => {
    render(<TimelineList timeline={mockTimeline} />);

    expect(screen.getByText('Server')).toBeInTheDocument();
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByText('Faro')).toBeInTheDocument();

    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText('WARN')).toBeInTheDocument();
    expect(screen.getByText('INFO')).toBeInTheDocument();
  });

  it('expands row on click to show structured fields and stack trace', () => {
    render(<TimelineList timeline={mockTimeline} />);

    expect(screen.queryByText('Structured Fields')).not.toBeInTheDocument();
    expect(screen.queryByText(/org\.hibernate\.AssertionFailure/)).not.toBeInTheDocument();

    const rowWithMessage = screen.getByText('Unexpected 5xx: errorId=E2EERR01');
    fireEvent.click(rowWithMessage);

    expect(screen.getByText('Structured Fields')).toBeInTheDocument();
    expect(screen.getByText(/org\.hibernate\.AssertionFailure/)).toBeInTheDocument();
  });

  it('shows truncated notice when truncated is true', () => {
    const { rerender } = render(<TimelineList timeline={mockTimeline} truncated={false} />);
    expect(screen.queryByText(/Truncated/)).not.toBeInTheDocument();

    rerender(<TimelineList timeline={mockTimeline} truncated={true} />);
    expect(screen.getByText(/Truncated to first 500 lines/)).toBeInTheDocument();
  });

  it('Copy raw fetches /api/v1/diagnostics/lookup/raw and copies JSON to clipboard', async () => {
    const rawData = [
      { at: '2026-09-01T12:00:00.000Z', source: 'server', labels: { env: 'e2e' }, line: '{"message":"raw line"}' },
    ];

    vi.mocked(api.GET).mockResolvedValue({
      data: rawData,
      error: undefined,
      response: new Response(),
    } as never);

    render(<TimelineList timeline={mockTimeline} currentRef="E2EERR01" currentType="errorId" />);

    const copyRawBtn = screen.getByRole('button', { name: /Copy raw/i });
    fireEvent.click(copyRawBtn);

    expect(api.GET).toHaveBeenCalledWith('/api/v1/diagnostics/lookup/raw', {
      params: {
        query: {
          ref: 'E2EERR01',
          type: 'errorId',
        },
      },
    });

    await vi.waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify(rawData, null, 2));
      expect(toast.success).toHaveBeenCalledWith('Raw log entries copied to clipboard');
    });
  });

  it('shows error toast when Copy raw request fails', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: undefined,
      error: new Error('Network error'),
      response: new Response(),
    } as never);

    render(<TimelineList timeline={mockTimeline} currentRef="E2EERR01" />);

    const copyRawBtn = screen.getByRole('button', { name: /Copy raw/i });
    fireEvent.click(copyRawBtn);

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to fetch raw log lines');
    });
  });
});
