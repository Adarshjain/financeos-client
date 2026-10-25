import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NAVIGATION_PROGRESS_DELAY_MS, NAVIGATION_PROGRESS_TIMEOUT_MS, NavigationProgress } from '../NavigationProgress';
import { endNavigation, hasInAppHistory, resetInAppNavigation, usePendingPath } from '../navigationStore';

const CURRENT = '/ds/accounts';
let pathname = '/ds/accounts';
let search = '';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));

function Pending() {
  return <span data-testid="pending">{usePendingPath() ?? 'none'}</span>;
}

function setup() {
  const view = render(
    <>
      <NavigationProgress />
      <Pending />
      <a href="/ds/inbox">inbox</a>
      <a href="/ds/transactions?tab=all">withSearch</a>
      <a href="https://example.com/x">external</a>
      <a href={CURRENT}>same</a>
      <a href={`${CURRENT}#top`}>hash</a>
      <a href="/ds/inbox" target="_blank">blank</a>
      <a href="/ds/inbox" download>download</a>
      <a href="/ds/inbox" data-disabled>dataDisabled</a>
      <a href="/ds/inbox" aria-disabled="true">ariaDisabled</a>
    </>,
  );
  return view;
}

const bar = () => screen.queryByRole('progressbar');
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('NavigationProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pathname = '/ds/accounts';
    search = '';
    window.history.replaceState({}, '', '/ds/accounts');
  });
  afterEach(() => {
    act(() => endNavigation());
    vi.useRealTimers();
  });

  it('shows the bar after the delay when an in-app link to another page is clicked', () => {
    setup();
    fireEvent.click(screen.getByText('inbox'));
    expect(screen.getByTestId('pending')).toHaveTextContent('/ds/inbox');
    expect(bar()).toBeNull();
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    expect(bar()).toBeInTheDocument();
  });

  it('treats a different search on the same path as a navigation', () => {
    setup();
    fireEvent.click(screen.getByText('withSearch'));
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    expect(bar()).toBeInTheDocument();
  });

  it.each([
    ['external link', () => fireEvent.click(screen.getByText('external'))],
    ['same URL', () => fireEvent.click(screen.getByText('same'))],
    ['hash-only change', () => fireEvent.click(screen.getByText('hash'))],
    ['target=_blank', () => fireEvent.click(screen.getByText('blank'))],
    ['data-disabled link', () => fireEvent.click(screen.getByText('dataDisabled'))],
    ['aria-disabled link', () => fireEvent.click(screen.getByText('ariaDisabled'))],
    ['download link', () => fireEvent.click(screen.getByText('download'))],
    ['ctrl click', () => fireEvent.click(screen.getByText('inbox'), { ctrlKey: true })],
    ['meta click', () => fireEvent.click(screen.getByText('inbox'), { metaKey: true })],
    ['shift click', () => fireEvent.click(screen.getByText('inbox'), { shiftKey: true })],
    ['middle click', () => fireEvent.click(screen.getByText('inbox'), { button: 1 })],
  ])('ignores %s', (_name, act_) => {
    setup();
    act_();
    wait(NAVIGATION_PROGRESS_DELAY_MS * 3);
    expect(bar()).toBeNull();
    expect(screen.getByTestId('pending')).toHaveTextContent('none');
  });

  it('never shows the bar when the route commits before the delay', () => {
    const { rerender } = setup();
    fireEvent.click(screen.getByText('inbox'));
    wait(NAVIGATION_PROGRESS_DELAY_MS - 20);
    pathname = '/ds/inbox';
    rerender(<><NavigationProgress /><Pending /></>);
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    expect(bar()).toBeNull();
    expect(screen.getByTestId('pending')).toHaveTextContent('none');
  });

  it('hides when the pathname changes', () => {
    const { rerender } = setup();
    fireEvent.click(screen.getByText('inbox'));
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    expect(bar()).toBeInTheDocument();
    pathname = '/ds/inbox';
    rerender(<><NavigationProgress /><Pending /></>);
    expect(bar()).toBeNull();
    expect(screen.getByTestId('pending')).toHaveTextContent('none');
  });

  it('hides when only the search changes', () => {
    const { rerender } = setup();
    fireEvent.click(screen.getByText('withSearch'));
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    search = 'tab=all';
    rerender(<><NavigationProgress /><Pending /></>);
    expect(bar()).toBeNull();
  });

  it('ends a pending navigation when the current page is clicked before the commit', () => {
    setup();
    fireEvent.click(screen.getByText('inbox'));
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    expect(bar()).toBeInTheDocument();
    fireEvent.click(screen.getByText('same'));
    expect(bar()).toBeNull();
    expect(screen.getByTestId('pending')).toHaveTextContent('none');
  });

  it('gives up when the route never commits', () => {
    setup();
    fireEvent.click(screen.getByText('inbox'));
    wait(NAVIGATION_PROGRESS_DELAY_MS);
    wait(NAVIGATION_PROGRESS_TIMEOUT_MS);
    expect(bar()).toBeNull();
    expect(screen.getByTestId('pending')).toHaveTextContent('none');
  });

  it('tracks in-app history depth across push, back and search-only commits', () => {
    resetInAppNavigation();
    pathname = '/ds/dashboards/1';
    const view = setup();
    expect(hasInAppHistory()).toBe(false);
    const go = (path: string, pop = false) => {
      pathname = path;
      if (pop) act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
      view.rerender(<NavigationProgress />);
    };
    search = 'a=1';
    go('/ds/dashboards/1');
    expect(hasInAppHistory()).toBe(false);
    go('/ds/inbox');
    expect(hasInAppHistory()).toBe(true);
    go('/ds/dashboards/1', true);
    // back on the landing page: the entry behind it is outside the app
    expect(hasInAppHistory()).toBe(false);
    go('/ds/inbox', true);
    expect(hasInAppHistory()).toBe(true);
    pathname = '/ds/accounts';
  });
});
