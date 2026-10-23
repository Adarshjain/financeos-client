import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NewVersionWatcher, VERSION_CHECK_INTERVAL_MS } from './NewVersionWatcher';

const showToast = vi.fn();
vi.mock('@/components/ds', () => ({ showToast: (...a: unknown[]) => showToast(...a) }));

const fetchMock = vi.fn();
let deployed = 'v1';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  deployed = 'v1';
  showToast.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({ version: deployed }) }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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
    expect(showToast).not.toHaveBeenCalled();
  });

  it('shows one persistent Reload toast when focus finds a newer deploy, and stops checking', async () => {
    render(<NewVersionWatcher loadedVersion="v1" />);
    deployed = 'v2';
    await focus();
    expect(showToast).toHaveBeenCalledTimes(1);
    const [message, options] = showToast.mock.calls[0];
    expect(message).toBe('New version available');
    expect(options.duration).toBe(Infinity);
    expect(options.action.label).toBe('Reload');
    vi.setSystemTime(Date.now() + 60_000);
    await focus();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledTimes(1);
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
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it('checks every 10 minutes', async () => {
    render(<NewVersionWatcher loadedVersion="v1" />);
    deployed = 'v2';
    await act(async () => {
      vi.advanceTimersByTime(VERSION_CHECK_INTERVAL_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it('ignores an unreadable answer', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    render(<NewVersionWatcher loadedVersion="v1" />);
    await focus();
    expect(showToast).not.toHaveBeenCalled();
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
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the first loaded version when a refresh renders a newer one', async () => {
    const { rerender } = render(<NewVersionWatcher loadedVersion="v1" />);
    rerender(<NewVersionWatcher loadedVersion="v2" />);
    deployed = 'v2';
    await focus();
    expect(showToast).toHaveBeenCalledTimes(1);
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
    expect(showToast).not.toHaveBeenCalled();
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
    expect(showToast).not.toHaveBeenCalled();
  });
});
