import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { MessageBubble } from './MessageBubble';

describe('MessageBubble', () => {
  it('renders the message with brand tint and the small bottom-right corner', () => {
    render(<MessageBubble>Hello there</MessageBubble>);
    const bubble = screen.getByText('Hello there');
    expect(bubble).toHaveClass('bg-brand-tint', 'rounded-ds-xl', 'rounded-br-ds-xs');
  });

  it('aligns to the end and keeps a left margin step so it never spans the column', () => {
    const { container } = render(<MessageBubble>Hi</MessageBubble>);
    expect(container.firstChild).toHaveClass('items-end', 'pl-space-64');
  });

  it('renders meta under the bubble in the faint caption style', () => {
    render(<MessageBubble meta="10:42">Hi</MessageBubble>);
    expect(screen.getByText('10:42')).toHaveClass('text-caption', 'text-ink-faint', 'text-right');
  });

  it('renders no meta element when meta is omitted', () => {
    const { container } = render(<MessageBubble>Hi</MessageBubble>);
    expect(container.firstChild?.childNodes).toHaveLength(1);
  });

  it('forwards ref and className', () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(
      <MessageBubble ref={ref} className="mt-space-8">
        Hi
      </MessageBubble>,
    );
    expect(ref.current).toBe(container.firstChild);
    expect(ref.current).toHaveClass('mt-space-8');
  });
});
