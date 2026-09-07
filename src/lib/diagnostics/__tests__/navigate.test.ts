import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { navigateTo, setNavigator } from '@/lib/diagnostics/navigate';

describe('navigate utility', () => {
  const originalLocation = window.location;
  const mockAssign = vi.fn();

  beforeEach(() => {
    setNavigator(null);
    mockAssign.mockClear();
    delete (window as unknown as { location?: unknown }).location;
    (window as unknown as { location: unknown }).location = {
      ...originalLocation,
      assign: mockAssign,
    };
  });

  afterEach(() => {
    setNavigator(null);
    (window as unknown as { location: unknown }).location = originalLocation;
    vi.restoreAllMocks();
  });

  it('uses registered navigator function when set', () => {
    const customNav = vi.fn();
    setNavigator(customNav);

    navigateTo('/debug?ref=test-123');

    expect(customNav).toHaveBeenCalledWith('/debug?ref=test-123');
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it('resets to window.location.assign when setNavigator is called with null', () => {
    const customNav = vi.fn();
    setNavigator(customNav);
    setNavigator(null);

    navigateTo('/debug?ref=test-456');

    expect(customNav).not.toHaveBeenCalled();
    expect(mockAssign).toHaveBeenCalledWith('/debug?ref=test-456');
  });
});
