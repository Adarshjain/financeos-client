import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NewVersionWatcher, VERSION_CHECK_INTERVAL_MS } from './NewVersionWatcher';

const fetchMock = vi.fn();
let deployed = 'v1';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  deployed = 'v1';
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({ version: deployed }) }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Shown banners; a dismissed one stays mounted (to slide out) but hidden, so role queries skip it. */
const bannerCount = () => screen.queryAllByRole('status').filter((el) => el.textContent?.includes('FinanceOS was updated')).length;

const focus = async () => {
  await act(async () => {
    window.dispatchEvent(new Event('focus'));
  });
};

describe('NewVersionWatcher', () => {
  it('does not fetch on load', () => {
    render(<NewVersionWatcher loadedVersion="v1" />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stays quiet on focus while the deployed version is the loaded one', async () => {
    render(<NewVersionWatcher loadedVersion="v1" />);
    await focus();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bannerCount()).toBe(0);
  });

  it('shows one banner with Refresh when focus finds a newer deploy, and stops checking', async () => {
    render(<NewVersionWatcher loadedVersion="v1" />);
    deployed = 'v2';
    await focus();
    expect(bannerCount()).toBe(1);
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy();
    vi.setSystemTime(Date.now() + 60_000);
    await focus();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bannerCount()).toBe(1);
  });

  it('reloads the page on Refresh', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    render(<NewVersionWatcher loadedVersion="v1" />);
    deployed = 'v2';
    await focus();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('hides on dismiss and does not come back in this tab', async () => {
    render(<NewVersionWatcher loadedVersion="v1" />);
    deployed = 'v2';
    await focus();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(bannerCount()).toBe(0);
    vi.setSystemTime(Date.now() + 60_000);
    await focus();
    await act(async () => {
      vi.advanceTimersByTime(VERSION_CHECK_INTERVAL_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bannerCount()).toBe(0);
  });

  it('checks when the tab becomes visible, and not when it is hidden', async () => {
    render(<NewVersionWatcher loadedVersion="v1" />);
    deployed = 'v2';
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(fetchMock).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(bannerCount()).toBe(1);
  });

  it('checks every 10 minutes', async () => {
    render(<NewVersionWatcher loadedVersion="v1" />);
    deployed = 'v2';
    await act(async () => {
      vi.advanceTimersByTime(VERSION_CHECK_INTERVAL_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bannerCount()).toBe(1);
  });

  it('ignores an unreadable answer', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    render(<NewVersionWatcher loadedVersion="v1" />);
    await focus();
    expect(bannerCount()).toBe(0);
  });

  it('treats a failed chunk load as a new version, once', async () => {
    render(<NewVersionWatcher loadedVersion="v1" />);
    const err = Object.assign(new Error('Loading chunk 42 failed.'), { name: 'ChunkLoadError' });
    await act(async () => {
      window.dispatchEvent(new ErrorEvent('error', { error: err, message: err.message }));
    });
    await act(async () => {
      window.dispatchEvent(
        Object.assign(new Event('unhandledrejection'), { reason: new Error('Failed to fetch dynamically imported module: /x.js') })
      );
    });
    expect(bannerCount()).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the first loaded version when a refresh renders a newer one', async () => {
    const { rerender } = render(<NewVersionWatcher loadedVersion="v1" />);
    rerender(<NewVersionWatcher loadedVersion="v2" />);
    deployed = 'v2';
    await focus();
    expect(bannerCount()).toBe(1);
  });

  it('does not announce a failed chunk load in dev', async () => {
    render(<NewVersionWatcher loadedVersion="dev" />);
    const err = Object.assign(new Error('Loading chunk 42 failed.'), { name: 'ChunkLoadError' });
    await act(async () => {
      window.dispatchEvent(new ErrorEvent('error', { error: err, message: err.message }));
    });
    await act(async () => {
      window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: err }));
    });
    expect(bannerCount()).toBe(0);
  });

  it('skips the 10-minute check while the tab is hidden', async () => {
    render(<NewVersionWatcher loadedVersion="v1" />);
    deployed = 'v2';
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await act(async () => {
      vi.advanceTimersByTime(VERSION_CHECK_INTERVAL_MS);
    });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignores unrelated errors', async () => {
    render(<NewVersionWatcher loadedVersion="v1" />);
    await act(async () => {
      window.dispatchEvent(new ErrorEvent('error', { error: new Error('boom'), message: 'boom' }));
    });
    expect(bannerCount()).toBe(0);
  });
});
