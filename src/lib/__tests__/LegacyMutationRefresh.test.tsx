import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isWriteRequest, LegacyMutationRefresh } from '../LegacyMutationRefresh';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('LegacyMutationRefresh', () => {
  const realFetch = window.fetch;
  let base: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockClear();
    base = vi.fn(async () => new Response('{}', { status: 200 }));
    window.fetch = base as unknown as typeof window.fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
    window.fetch = realFetch;
  });

  const call = async (url: string, method = 'GET') => {
    await act(async () => {
      await window.fetch(url, { method });
    });
  };
  const flush = () => act(() => void vi.advanceTimersByTime(300));

  it('refreshes once after a successful write', async () => {
    render(<LegacyMutationRefresh />);
    await call('/api/v1/loans', 'POST');
    expect(refresh).not.toHaveBeenCalled();
    flush();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh after a failed write', async () => {
    render(<LegacyMutationRefresh />);
    base.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    await call('/api/v1/loans/1', 'PATCH');
    flush();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('does not refresh for reads or read-only POSTs', async () => {
    render(<LegacyMutationRefresh />);
    await call('/api/v1/accounts', 'GET');
    await call('/api/v1/transactions/search', 'POST');
    await call('/api/other', 'POST');
    flush();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('collapses a burst of writes into one refresh', async () => {
    render(<LegacyMutationRefresh />);
    await call('/api/v1/transactions/1', 'DELETE');
    await call('/api/v1/transactions/2', 'DELETE');
    await call('/api/v1/transactions/3', 'DELETE');
    flush();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('reads method and url from a Request input', async () => {
    render(<LegacyMutationRefresh />);
    await act(async () => {
      await window.fetch(new Request('http://localhost/api/v1/rules/1', { method: 'PUT' }));
    });
    flush();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('restores fetch on unmount and stops refreshing', async () => {
    const { unmount } = render(<LegacyMutationRefresh />);
    unmount();
    expect(window.fetch).toBe(base);
    await call('/api/v1/loans', 'POST');
    flush();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('classifies write requests', () => {
    expect(isWriteRequest('post', '/api/v1/reports')).toBe(true);
    expect(isWriteRequest('POST', '/api/v1/reports/1/data')).toBe(false);
    expect(isWriteRequest('POST', '/api/v1/reports/underlying/csv')).toBe(false);
  });

  it('is mounted in the Legacy root layout and not in the /ds layouts', () => {
    const src = (p: string) => readFileSync(join(process.cwd(), 'src/app', p), 'utf8');
    expect(src('(legacy)/layout.tsx')).toContain('<LegacyMutationRefresh />');
    expect(src('(ds)/layout.tsx')).not.toContain('LegacyMutationRefresh');
  });
});
