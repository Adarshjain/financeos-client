import { act, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { installFakeVisualViewport } from '@/test/fakeVisualViewport';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));
vi.mock('@/actions/auth', () => ({ logout: vi.fn() }));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: undefined }) }));

import { MobileNav } from '../MobileNav';

const HIDDEN_CLASS = 'opacity-0';

function renderNav() {
  const { container } = render(<MobileNav userEmail="user@example.com" />);
  return container.querySelector('nav') as HTMLElement;
}

describe('MobileNav under the on-screen keyboard', () => {
  let installed: ReturnType<typeof installFakeVisualViewport> | undefined;

  afterEach(() => {
    installed?.uninstall();
    installed = undefined;
  });

  it('is shown and reachable when no keyboard is open', () => {
    const nav = renderNav();
    expect(nav).not.toHaveClass(HIDDEN_CLASS);
    expect(nav).not.toHaveAttribute('aria-hidden');
    expect(nav).not.toHaveAttribute('inert');
  });

  it('slides out and becomes inert while the keyboard is open, then returns', () => {
    const fake = installFakeVisualViewport();
    installed = fake;
    const nav = renderNav();

    act(() => fake.set({ height: window.innerHeight - 300 }));
    expect(nav).toHaveClass(HIDDEN_CLASS, 'pointer-events-none');
    expect(nav).toHaveAttribute('aria-hidden', 'true');
    expect(nav).toHaveAttribute('inert');

    act(() => fake.set({ height: window.innerHeight }));
    expect(nav).not.toHaveClass(HIDDEN_CLASS);
    expect(nav).not.toHaveAttribute('aria-hidden');
    expect(nav).not.toHaveAttribute('inert');
  });

  it('is unaffected in browsers without visualViewport', () => {
    const nav = renderNav();
    expect(nav).not.toHaveAttribute('aria-hidden');
  });
});
