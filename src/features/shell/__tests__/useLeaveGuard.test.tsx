import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import Link from 'next/link';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useLeaveGuard } from '../useLeaveGuard';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

function Page({ active }: { active: boolean }) {
  const guard = useLeaveGuard(active);
  return (
    <div>
      <Link href="/ds/reports">Reports</Link>
      <Link href="/ds/reports/new#top">Same page hash</Link>
      <a href="https://example.com/x">Outside</a>
      <Link href="/ds/inbox" target="_blank">New tab</Link>
      <button onClick={() => guard.requestLeave('/ds/reports')}>Cancel</button>
      <output data-testid="pending">{guard.pendingHref ?? ''}</output>
      <button onClick={guard.confirmLeave}>Leave</button>
      <button onClick={guard.cancelLeave}>Stay</button>
    </div>
  );
}

beforeEach(() => {
  push.mockClear();
  window.history.replaceState(null, '', '/ds/reports/new');
});
afterEach(() => vi.restoreAllMocks());

const pending = () => screen.getByTestId('pending').textContent;

describe('useLeaveGuard', () => {
  it('lets a link navigate when nothing is unsaved', () => {
    render(<Page active={false} />);
    const prevented = !fireEvent.click(screen.getByText('Reports'));
    expect(prevented).toBe(false);
    expect(pending()).toBe('');
  });

  it('stops an in-app link and holds where it led while work is unsaved', () => {
    render(<Page active />);
    const notPrevented = fireEvent.click(screen.getByText('Reports'));
    expect(notPrevented).toBe(false);
    expect(pending()).toBe('/ds/reports');
    expect(push).not.toHaveBeenCalled();
  });

  it('stops the click before the app’s own link handlers see it', () => {
    const appHandler = vi.fn();
    const { container } = render(
      <div onClick={appHandler}>
        <Page active />
      </div>,
    );
    fireEvent.click(container.querySelector('a')!);
    expect(appHandler).not.toHaveBeenCalled();
  });

  it('goes where the link led after Leave, and stays after Stay', () => {
    render(<Page active />);
    fireEvent.click(screen.getByText('Reports'));
    fireEvent.click(screen.getByText('Stay'));
    expect(pending()).toBe('');
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Reports'));
    fireEvent.click(screen.getByText('Leave'));
    expect(push).toHaveBeenCalledWith('/ds/reports');
    expect(pending()).toBe('');
  });

  it('leaves alone a link to this same address, a new tab, a modified click and another site', () => {
    render(<Page active />);
    fireEvent.click(screen.getByText('Same page hash'));
    fireEvent.click(screen.getByText('New tab'));
    fireEvent.click(screen.getByText('Outside'));
    fireEvent.click(screen.getByText('Reports'), { metaKey: true });
    fireEvent.click(screen.getByText('Reports'), { ctrlKey: true });
    expect(pending()).toBe('');
  });

  it('asks before a button that navigates from code, and goes at once when nothing is unsaved', () => {
    const { rerender } = render(<Page active />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(pending()).toBe('/ds/reports');
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Stay'));
    rerender(<Page active={false} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(push).toHaveBeenCalledWith('/ds/reports');
  });

  it('shows the browser prompt on close or reload only while work is unsaved', () => {
    const { rerender } = render(<Page active />);
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    rerender(<Page active={false} />);
    const later = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(later);
    expect(later.defaultPrevented).toBe(false);
  });

  it('stops Back, puts the address back and holds where Back led', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    const reachedRouter = vi.fn();
    window.addEventListener('popstate', reachedRouter);
    render(<Page active />);
    // The browser has moved to the previous page by the time popstate fires.
    window.history.replaceState(null, '', '/ds/reports');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(pending()).toBe('/ds/reports');
    expect(pushState).toHaveBeenCalledWith(null, '', '/ds/reports/new');
    expect(reachedRouter).not.toHaveBeenCalled();
    window.removeEventListener('popstate', reachedRouter);
  });

  describe('Back, then Keep editing, then Back, then Leave', () => {
    // The browser's Navigation API tells which way a step went; jsdom has none, so stand one in.
    const nav = { currentEntry: { index: 5 } };
    beforeEach(() => {
      (window as unknown as { navigation: typeof nav }).navigation = nav;
      nav.currentEntry.index = 5;
    });
    afterEach(() => {
      delete (window as unknown as { navigation?: typeof nav }).navigation;
    });

    const pressBack = () => {
      nav.currentEntry.index = 4;
      window.history.replaceState({ page: 'previous' }, '', '/ds/reports');
      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      // The guard pushed the protected entry back on top of the one Back led to.
      nav.currentEntry.index = 5;
    };

    it('restores the protected page’s own history state, then steps back once with no extra entry', () => {
      window.history.replaceState({ page: 'protected' }, '', '/ds/reports/new');
      const pushState = vi.spyOn(window.history, 'pushState');
      const go = vi.spyOn(window.history, 'go').mockImplementation(() => undefined);
      render(<Page active />);

      pressBack();
      expect(pending()).toBe('/ds/reports');
      expect(pushState).toHaveBeenCalledWith({ page: 'protected' }, '', '/ds/reports/new');
      fireEvent.click(screen.getByText('Stay'));
      expect(pending()).toBe('');
      expect(go).not.toHaveBeenCalled();

      window.history.replaceState({ page: 'protected' }, '', '/ds/reports/new');
      pressBack();
      expect(pending()).toBe('/ds/reports');
      fireEvent.click(screen.getByText('Leave'));
      expect(go).toHaveBeenCalledWith(-1);
      expect(push).not.toHaveBeenCalled();
      expect(pushState).toHaveBeenCalledTimes(2);
    });

    it('navigates with the router after a Forward, since the entry it led to is gone', () => {
      const go = vi.spyOn(window.history, 'go').mockImplementation(() => undefined);
      render(<Page active />);
      nav.currentEntry.index = 6;
      window.history.replaceState(null, '', '/ds/inbox');
      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      fireEvent.click(screen.getByText('Leave'));
      expect(push).toHaveBeenCalledWith('/ds/inbox');
      expect(go).not.toHaveBeenCalled();
    });
  });

  it('removes its listeners when the page goes away', () => {
    const { unmount } = renderHook(() => useLeaveGuard(true));
    unmount();
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
