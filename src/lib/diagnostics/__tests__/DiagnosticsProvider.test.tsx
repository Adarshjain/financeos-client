import { render, renderHook, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getFaro } from '@/instrumentation-client';
import { DiagnosticsProvider, useDiagnostics } from '@/lib/diagnostics/DiagnosticsProvider';
import { errorLog } from '@/lib/diagnostics/errorLog';
import { navigateTo } from '@/lib/diagnostics/navigate';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/instrumentation-client', () => ({
  getFaro: vi.fn(),
}));

describe('DiagnosticsProvider', () => {
  const mockRouterPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({ push: mockRouterPush } as never);
    vi.mocked(getFaro).mockReturnValue({
      api: {
        getSession: () => ({ id: 'faro-session-123' }),
      },
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function TestConsumer() {
    const { pageRequestId, admin, sessionId } = useDiagnostics();
    return (
      <div>
        <span data-testid="req-id">{pageRequestId ?? 'none'}</span>
        <span data-testid="admin">{admin ? 'true' : 'false'}</span>
        <span data-testid="sess-id">{sessionId ?? 'none'}</span>
      </div>
    );
  }

  it('provides context values and registers/unregisters navigator', () => {
    const { unmount } = render(
      <DiagnosticsProvider
        pageRequestId="page-req-001"
        userId="user-123"
        admin={true}
      >
        <TestConsumer />
      </DiagnosticsProvider>,
    );

    expect(screen.getByTestId('req-id').textContent).toBe('page-req-001');
    expect(screen.getByTestId('admin').textContent).toBe('true');
    expect(screen.getByTestId('sess-id').textContent).toBe('faro-session-123');

    // Navigator should be set to router.push
    navigateTo('/debug?ref=test');
    expect(mockRouterPush).toHaveBeenCalledWith('/debug?ref=test');

    // On unmount, navigator is reset
    unmount();
    const originalLocation = window.location;
    const mockAssign = vi.fn();
    delete (window as unknown as { location?: unknown }).location;
    (window as unknown as { location: unknown }).location = {
      ...originalLocation,
      assign: mockAssign,
    };
    try {
      navigateTo('/debug?ref=unmounted');
      expect(mockAssign).toHaveBeenCalledWith('/debug?ref=unmounted');
    } finally {
      (window as unknown as { location: unknown }).location = originalLocation;
    }
  });

  it('updates errorLog owner when userId changes', () => {
    const spySetOwner = vi.spyOn(errorLog, 'setOwner');

    const { rerender } = render(
      <DiagnosticsProvider userId="user-aaa">
        <div>child</div>
      </DiagnosticsProvider>,
    );

    expect(spySetOwner).toHaveBeenCalledWith('user-aaa');

    rerender(
      <DiagnosticsProvider userId="user-bbb">
        <div>child</div>
      </DiagnosticsProvider>,
    );

    expect(spySetOwner).toHaveBeenCalledWith('user-bbb');
  });

  it('clears errorLog on financeos:auth-expired event', () => {
    const spyClear = vi.spyOn(errorLog, 'clear');

    render(
      <DiagnosticsProvider userId="user-123">
        <div>child</div>
      </DiagnosticsProvider>,
    );

    window.dispatchEvent(new CustomEvent('financeos:auth-expired'));
    expect(spyClear).toHaveBeenCalled();
  });

  it('useDiagnostics returns safe defaults outside a provider', () => {
    const { result } = renderHook(() => useDiagnostics());
    expect(result.current.pageRequestId).toBeUndefined();
    expect(result.current.admin).toBe(false);
    expect(result.current.sessionId).toBeUndefined();
  });
});
