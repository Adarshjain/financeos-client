import { screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn() } };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/debug',
  useSearchParams: () => new URLSearchParams(),
}));

import { DebugPage } from '@/app/(protected)/debug/DebugPage';
import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

describe('DebugPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders non-admin mode with restriction notice and never calls api.GET', () => {
    renderWithQuery(<DebugPage admin={false} />);

    expect(screen.getByText('Admin Log Lookup Restricted')).toBeInTheDocument();
    expect(screen.getByText(/Send this reference to the developer/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Enter requestId or errorId/)).not.toBeInTheDocument();
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('renders admin mode with lookup form and no restriction notice', () => {
    renderWithQuery(<DebugPage admin={true} />);

    expect(screen.queryByText('Admin Log Lookup Restricted')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter requestId or errorId/)).toBeInTheDocument();
    expect(screen.getByText('Admin Mode')).toBeInTheDocument();
  });

  it('renders diagnostics data including RequestCard when lookup succeeds', async () => {
    const mockData = {
      ref: 'E2EERR01',
      refType: 'errorId',
      requestId: 'e2ereq-123',
      errorId: 'E2EERR01',
      found: true,
      truncated: false,
      request: {
        method: 'POST',
        route: '/api/v1/accounts',
        status: 500,
        durationMs: 42,
        at: new Date().toISOString(),
        userId: 'user-id-1',
        userEmail: 'user@example.test',
        version: '1.0.0-test',
        userAgent: 'test-agent',
        slow: false,
      },
      rootCause: {
        kind: 'SERVER_EXCEPTION',
        headline: 'Server Exception (AssertionFailure)',
        detail: 'Hibernate assertion failed',
        exceptionClass: 'org.hibernate.AssertionFailure',
        oraCode: null,
        rootFrame: 'org.hibernate.AssertionFailure: null identifier',
        hints: ['Check entity identifiers'],
      },
      timeline: [],
      rawAvailable: true,
    };

    vi.mocked(api.GET).mockResolvedValue({
      data: mockData,
      error: undefined,
      response: new Response(),
    } as never);

    renderWithQuery(<DebugPage admin={true} initialRef="E2EERR01" />);

    expect(await screen.findByText('HTTP Request Summary')).toBeInTheDocument();
    expect(screen.getByText('Server Exception (AssertionFailure)')).toBeInTheDocument();
    expect(screen.getByText('Event Timeline (0)')).toBeInTheDocument();
  });

  it('renders error callout when diagnostics lookup fails with 503 or error', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: undefined,
      error: new Error('Loki credentials lack read scope. Please configure LOKI_QUERY_TOKEN.'),
      response: new Response(),
    } as never);

    renderWithQuery(<DebugPage admin={true} initialRef="E2EERR01" />);

    expect(await screen.findByText('Diagnostics Lookup Failed')).toBeInTheDocument();
    expect(screen.getByText(/Loki credentials lack read scope/)).toBeInTheDocument();
  });
});
