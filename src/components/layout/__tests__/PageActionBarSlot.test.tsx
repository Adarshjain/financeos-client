import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { installFakeVisualViewport } from '@/test/fakeVisualViewport';

import { PageActionBar, PageActionBarProvider, PageActionBarSlot } from '../PageActionBarContext';

function renderBar(props: { hideOnScroll?: boolean; defaultCollapsed?: boolean } = {}) {
  return render(
    <PageActionBarProvider>
      <PageActionBarSlot />
      <PageActionBar {...props}>
        <input aria-label="Search" />
        <button type="button">Apply</button>
      </PageActionBar>
    </PageActionBarProvider>,
  );
}

/** The slot's root is the fixed wrapper around the collapse toggle. */
const root = () => screen.getByRole('button', { name: /action bar/i }).parentElement as HTMLElement;

const HIDDEN_CLASS = 'translate-y-36';

function scrollWindowTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
  fireEvent.scroll(window);
}

afterEach(() => {
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
});

describe('PageActionBarSlot keyboard anchoring', () => {
  let installed: ReturnType<typeof installFakeVisualViewport> | undefined;

  afterEach(() => {
    installed?.uninstall();
    installed = undefined;
  });

  it('stacks above MobileNav when no keyboard is open', () => {
    renderBar();
    expect(root()).toHaveStyle({ bottom: '64px' });
  });

  it('parks the collapsed toggle on the nav edge', () => {
    renderBar({ defaultCollapsed: true });
    expect(root()).toHaveStyle({ bottom: '53px' });
  });

  it('floats 8px above the keyboard while it is open and drops back when it closes', () => {
    const fake = installFakeVisualViewport();
    installed = fake;
    renderBar();

    act(() => fake.set({ height: window.innerHeight - 300 }));
    expect(root()).toHaveStyle({ bottom: '308px' });

    act(() => fake.set({ height: window.innerHeight }));
    expect(root()).toHaveStyle({ bottom: '64px' });
  });

  it('follows the visual viewport as iOS pans it to reveal the field', () => {
    const fake = installFakeVisualViewport({ height: window.innerHeight - 300 });
    installed = fake;
    renderBar();
    expect(root()).toHaveStyle({ bottom: '308px' });

    act(() => fake.set({ offsetTop: 40 }, 'scroll'));
    expect(root()).toHaveStyle({ bottom: '268px' });
  });

  it('floats the collapsed toggle above the keyboard too', () => {
    installed = installFakeVisualViewport({ height: window.innerHeight - 300 });
    renderBar({ defaultCollapsed: true });
    expect(root()).toHaveStyle({ bottom: '308px' });
  });
});

describe('PageActionBarSlot hide-on-scroll while a field inside has focus', () => {
  it('slides away on scroll-down and back on scroll-up (baseline)', () => {
    renderBar({ hideOnScroll: true });
    scrollWindowTo(100);
    expect(root()).toHaveClass(HIDDEN_CLASS);
    scrollWindowTo(60);
    expect(root()).not.toHaveClass(HIDDEN_CLASS);
  });

  it('stays put when the browser scrolls the page to reveal the focused field', () => {
    renderBar({ hideOnScroll: true });
    act(() => screen.getByLabelText('Search').focus());
    scrollWindowTo(100);
    expect(root()).not.toHaveClass(HIDDEN_CLASS);
  });

  it('re-shows a hidden bar when focus moves into it', () => {
    renderBar({ hideOnScroll: true });
    scrollWindowTo(100);
    expect(root()).toHaveClass(HIDDEN_CLASS);

    act(() => screen.getByLabelText('Search').focus());
    expect(root()).not.toHaveClass(HIDDEN_CLASS);
  });

  it('keeps the pause while focus moves between controls inside the bar', () => {
    renderBar({ hideOnScroll: true });
    act(() => screen.getByLabelText('Search').focus());
    act(() => screen.getByRole('button', { name: 'Apply' }).focus());
    scrollWindowTo(100);
    expect(root()).not.toHaveClass(HIDDEN_CLASS);
  });

  it('resumes after focus leaves, measuring from the current scroll position', () => {
    renderBar({ hideOnScroll: true });
    act(() => screen.getByLabelText('Search').focus());
    scrollWindowTo(300);
    expect(root()).not.toHaveClass(HIDDEN_CLASS);

    act(() => screen.getByLabelText('Search').blur());

    // Compared against 300 (where the page is now), not the stale pre-focus 0.
    scrollWindowTo(280);
    expect(root()).not.toHaveClass(HIDDEN_CLASS);
    scrollWindowTo(320);
    expect(root()).toHaveClass(HIDDEN_CLASS);
  });

  it('does not pause when hideOnScroll is off (focus is a no-op)', () => {
    renderBar({ hideOnScroll: false });
    act(() => screen.getByLabelText('Search').focus());
    scrollWindowTo(100);
    expect(root()).not.toHaveClass(HIDDEN_CLASS);
  });
});
