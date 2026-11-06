import { render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrollIntoViewOnSelect } from './ScrollIntoViewOnSelect';

describe('ScrollIntoViewOnSelect', () => {
  let scroll: ReturnType<typeof vi.fn>;
  let top: number;

  beforeEach(() => {
    scroll = vi.fn();
    top = 0;
    window.HTMLElement.prototype.scrollIntoView = scroll as unknown as typeof window.HTMLElement.prototype.scrollIntoView;
    vi.spyOn(window.HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ top }) as DOMRect);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => ({ scrollMarginTop: '56px' }) as CSSStyleDeclaration);
  });
  afterEach(() => vi.restoreAllMocks());

  const ui = (id: string, fromAddress: boolean) => (
    <ScrollIntoViewOnSelect selectedId={id} fromAddress={fromAddress}>
      <p>detail</p>
    </ScrollIntoViewOnSelect>
  );

  it('scrolls when picked from the address and the card is below the viewport', () => {
    top = window.innerHeight + 400;
    render(ui('a', true));
    expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
  });

  it('scrolls when the card top is under the sticky top bar', () => {
    top = 20;
    render(ui('a', true));
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('does not scroll when the card top is already visible', () => {
    top = 120;
    render(ui('a', true));
    expect(scroll).not.toHaveBeenCalled();
  });

  it('scrolls when the card top only peeks in at the bottom of the screen', () => {
    top = window.innerHeight - 40;
    render(ui('a', true));
    expect(scroll).toHaveBeenCalledTimes(1);
  });

  it('does not scroll without a selection in the address', () => {
    top = window.innerHeight + 400;
    render(ui('a', false));
    expect(scroll).not.toHaveBeenCalled();
  });

  it('scrolls again when the selected id changes', () => {
    top = window.innerHeight + 400;
    const { rerender } = render(ui('a', true));
    rerender(ui('a', true));
    expect(scroll).toHaveBeenCalledTimes(1);
    rerender(ui('b', true));
    expect(scroll).toHaveBeenCalledTimes(2);
  });
});
