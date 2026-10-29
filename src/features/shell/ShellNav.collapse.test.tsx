import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ShellRail } from './ShellNav';

vi.mock('next/navigation', () => ({ usePathname: () => '/transactions', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: { badge: 0 } }) }));
vi.mock('@/features/transactions/useNeedsReviewCount', () => ({ useNeedsReviewCount: () => ({ data: 0 }) }));
vi.mock('@/features/lendings/form/AddLendingProvider', () => ({ useAddLending: () => ({ open: vi.fn() }) }));

const user = { name: 'Arjun Mehta', email: 'a@b.c' };
let desk = true;

function savedCookie(): string | undefined {
  return document.cookie.split('; ').find((c) => c.startsWith('FINANCEOS_RAIL_COLLAPSED='));
}

beforeEach(() => {
  desk = true;
  document.cookie = 'FINANCEOS_RAIL_COLLAPSED=; max-age=0; path=/';
  window.matchMedia = ((query: string) => ({
    matches: desk && query === '(min-width: 641px)',
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  document.cookie = 'FINANCEOS_RAIL_COLLAPSED=; max-age=0; path=/';
});

describe('ShellRail collapse', () => {
  it('starts expanded, with the labelled search button', () => {
    render(<ShellRail user={user} />);
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Transactions/ })).toHaveTextContent('Transactions');
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('starts collapsed from initialCollapsed: icon-only links, search button and profile link', () => {
    render(<ShellRail user={user} initialCollapsed />);
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Transactions' });
    expect(link).not.toHaveTextContent('Transactions');
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Arjun Mehta' })).toHaveAttribute('href', '/settings');
    expect(screen.queryByText('⌘K')).not.toBeInTheDocument();
  });

  it('the toggle collapses and saves the choice in a cookie', () => {
    render(<ShellRail user={user} />);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    expect(savedCookie()).toBe('FINANCEOS_RAIL_COLLAPSED=1');
    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
    expect(savedCookie()).toBe('FINANCEOS_RAIL_COLLAPSED=0');
  });

  it('Cmd+B and Ctrl+B toggle the rail', () => {
    render(<ShellRail user={user} />);
    fireEvent.keyDown(window, { key: 'b', metaKey: true });
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'B', ctrlKey: true });
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
  });

  it('ignores B with other modifiers, without a modifier, when prevented, and below the desk breakpoint', () => {
    render(<ShellRail user={user} />);
    fireEvent.keyDown(window, { key: 'b' });
    fireEvent.keyDown(window, { key: 'b', metaKey: true, shiftKey: true });
    fireEvent.keyDown(window, { key: 'b', metaKey: true, altKey: true });
    const prevented = new KeyboardEvent('keydown', { key: 'b', metaKey: true, cancelable: true });
    prevented.preventDefault();
    window.dispatchEvent(prevented);
    desk = false;
    fireEvent.keyDown(window, { key: 'b', metaKey: true });
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
  });

  it('stops listening once unmounted', () => {
    const { unmount } = render(<ShellRail user={user} />);
    unmount();
    fireEvent.keyDown(window, { key: 'b', metaKey: true });
    expect(savedCookie()).toBeUndefined();
  });
});
