import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { RequestCard } from '@/app/(protected)/debug/RequestCard';
import type { DiagnosticsLookupResponse } from '@/lib/api/types';

describe('RequestCard', () => {
  it('renders HTTP status badge and slow badge', () => {
    const statuses = [500, 404, 302, 200];

    for (const status of statuses) {
      const request: NonNullable<DiagnosticsLookupResponse['request']> = {
        method: 'POST',
        route: '/api/v1/accounts',
        status,
        durationMs: 120,
        at: '2026-09-01T12:00:00.000Z',
        slow: true,
      };

      const { unmount } = render(<RequestCard request={request} />);
      expect(screen.getByText(String(status))).toBeInTheDocument();
      expect(screen.getByText('Slow')).toBeInTheDocument();
      unmount();
    }
  });

  it('renders userEmail when present, then userId prefix, then Anonymous fallback', () => {
    // 1. userEmail present
    const req1 = {
      method: 'GET',
      route: '/api/v1/accounts',
      status: 200,
      durationMs: 10,
      at: '2026-09-01T12:00:00.000Z',
      userId: '12345678-abcd',
      userEmail: 'admin@financeos.com',
      slow: false,
    };
    const { unmount: u1 } = render(<RequestCard request={req1} />);
    expect(screen.getByText('admin@financeos.com')).toBeInTheDocument();
    u1();

    // 2. userId only
    const req2 = {
      method: 'GET',
      route: '/api/v1/accounts',
      status: 200,
      durationMs: 10,
      at: '2026-09-01T12:00:00.000Z',
      userId: '12345678-abcd',
      slow: false,
    };
    const { unmount: u2 } = render(<RequestCard request={req2} />);
    expect(screen.getByText('User: 12345678…')).toBeInTheDocument();
    u2();

    // 3. Anonymous fallback
    const req3 = {
      method: 'GET',
      route: '/api/v1/accounts',
      status: 200,
      durationMs: 10,
      at: '2026-09-01T12:00:00.000Z',
      slow: false,
    };
    const { unmount: u3 } = render(<RequestCard request={req3} />);
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
    u3();
  });

  it('renders version or unknown fallback', () => {
    const req = {
      method: 'GET',
      route: '/api/v1/accounts',
      status: 200,
      durationMs: 10,
      at: '2026-09-01T12:00:00.000Z',
      version: '2.0.0-beta',
      slow: false,
    };
    const { unmount } = render(<RequestCard request={req} />);
    expect(screen.getByText('2.0.0-beta')).toBeInTheDocument();
    unmount();

    const reqNoVer = {
      method: 'GET',
      route: '/api/v1/accounts',
      status: 200,
      durationMs: 10,
      at: '2026-09-01T12:00:00.000Z',
      slow: false,
    };
    render(<RequestCard request={reqNoVer} />);
    expect(screen.getByText('unknown')).toBeInTheDocument();
  });
});
