import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NavigationProgress } from '../NavigationProgress';
import { endNavigation } from '../navigationStore';
import { ShellRail } from '../ShellNav';

let pathname = '/ds/accounts';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: { badge: 0 } }) }));
vi.mock('@/features/transactions/useNeedsReviewCount', () => ({ useNeedsReviewCount: () => ({ data: 0 }) }));

const tree = () => (
  <>
    <NavigationProgress />
    <ShellRail user={{ email: 'a@example.test' }} />
  </>
);
const currentLabel = () => screen.getByRole('link', { current: 'page' }).textContent;

describe('ShellRail optimistic current item', () => {
  afterEach(() => {
    act(() => endNavigation());
    pathname = '/ds/accounts';
  });

  it('marks the clicked item current before the pathname changes, and follows the pathname after the commit', () => {
    window.history.replaceState({}, '', '/ds/accounts');
    const { rerender } = render(tree());
    expect(currentLabel()).toMatch(/Accounts/);
    fireEvent.click(screen.getByRole('link', { name: /Inbox/ }));
    expect(currentLabel()).toMatch(/Inbox/);
    pathname = '/ds/inbox';
    rerender(tree());
    expect(currentLabel()).toMatch(/Inbox/);
    pathname = '/ds/accounts';
    rerender(tree());
    expect(currentLabel()).toMatch(/Accounts/);
  });
});
