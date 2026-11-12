import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const replace = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn() }), usePathname: () => '/inbox' }));

import { item } from './inboxTestUtils';
import { useInboxDeepLink } from './useInboxDeepLink';

const items = [item({ key: 'page:/investments/nps', href: '/investments/nps' }), item({ key: 'plain' })];

describe('useInboxDeepLink', () => {
  beforeEach(() => replace.mockClear());

  it('replaces the address with the row href when the key exists', () => {
    renderHook(() => useInboxDeepLink('page:/investments/nps', items));
    expect(replace).toHaveBeenCalledWith('/investments/nps');
  });

  it('stays on the Inbox when no row has that key', () => {
    renderHook(() => useInboxDeepLink('gone', items));
    expect(replace).not.toHaveBeenCalled();
  });

  it('stays when the row has no href, or there is no key, or the list has not loaded', () => {
    renderHook(() => useInboxDeepLink('plain', items));
    renderHook(() => useInboxDeepLink(null, items));
    renderHook(() => useInboxDeepLink('page:/investments/nps', null));
    expect(replace).not.toHaveBeenCalled();
  });
});
