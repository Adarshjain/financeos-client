import { act, render } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRefreshOnHistoryReturn } from './useRefreshOnHistoryReturn';

let path = '/a';
let search = '';
const refresh = vi.hoisted(() => vi.fn());
const invalidate = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh }) }));
vi.mock('@/lib/query/client', () => ({ getQueryClient: () => ({ invalidateQueries: invalidate }) }));

function Probe() {
  useRefreshOnHistoryReturn(path, search);
  return null;
}

const url = () => `${path}${search ? `?${search}` : ''}`;
function mount(strict = false) {
  const tree = () =>
    strict ? (
      <React.StrictMode>
        <Probe />
      </React.StrictMode>
    ) : (
      <Probe />
    );
  const view = render(tree());
  return () => view.rerender(tree());
}
const pop = (to: string) => {
  window.history.replaceState({}, '', to);
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
};

describe('useRefreshOnHistoryReturn', () => {
  beforeEach(() => {
    path = '/a';
    search = '';
    refresh.mockClear();
    invalidate.mockClear();
    window.history.replaceState({}, '', '/a');
  });

  it('refreshes once and invalidates active queries after a pop commits', () => {
    const rerender = mount();
    pop('/b?x=1');
    path = '/b';
    search = 'x=1';
    rerender();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ refetchType: 'active' });
    rerender();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh twice under strict mode', () => {
    const rerender = mount(true);
    pop('/b');
    path = '/b';
    rerender();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh on a push', () => {
    const rerender = mount();
    window.history.pushState({}, '', '/b');
    path = '/b';
    rerender();
    expect(refresh).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('does not refresh when a cancelled pop is followed by a push', () => {
    const rerender = mount();
    window.history.pushState({}, '', '/b');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.history.pushState({}, '', '/c');
    path = '/c';
    rerender();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('does not refresh when a pop lands on the same URL', () => {
    const rerender = mount();
    pop(url());
    rerender();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes on a bfcache restore only', () => {
    mount();
    const show = (persisted: boolean) =>
      act(() => {
        const e = new Event('pageshow') as Event & { persisted: boolean };
        e.persisted = persisted;
        window.dispatchEvent(e);
      });
    show(false);
    expect(refresh).not.toHaveBeenCalled();
    show(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
