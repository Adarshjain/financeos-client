import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Reveal } from './Reveal';

describe('Reveal', () => {
  it('shows children with full size and opacity when open', () => {
    render(
      <Reveal open data-testid="r">
        <input aria-label="To" />
      </Reveal>,
    );
    const root = screen.getByTestId('r');
    expect(root).toHaveStyle({ gridTemplateRows: '1fr' });
    expect(root).toHaveClass('opacity-100', 'duration-base', 'motion-reduce:transition-none');
    expect(root).not.toHaveAttribute('inert');
    expect(root).not.toHaveAttribute('aria-hidden');
  });

  it('keeps children mounted but collapsed, inert and hidden when closed', () => {
    render(
      <Reveal open={false} data-testid="r">
        <input aria-label="To" />
      </Reveal>,
    );
    const root = screen.getByTestId('r');
    expect(screen.getByLabelText('To', { selector: 'input' })).toBeInTheDocument();
    expect(root).toHaveStyle({ gridTemplateRows: '0fr' });
    expect(root).toHaveClass('opacity-0');
    expect(root).toHaveAttribute('inert');
    expect(root).toHaveAttribute('aria-hidden', 'true');
  });

  it('animates the width on the x axis', () => {
    render(
      <Reveal open={false} axis="x" data-testid="r">
        x
      </Reveal>,
    );
    const root = screen.getByTestId('r');
    expect(root).toHaveStyle({ gridTemplateColumns: '0fr' });
    expect(root.style.gridTemplateRows).toBe('');
  });

  it('forwards ref and className', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Reveal ref={ref} open className="flex-1" data-testid="r">
        x
      </Reveal>,
    );
    expect(ref.current).toBe(screen.getByTestId('r'));
    expect(ref.current).toHaveClass('flex-1');
  });

  const inner = () => screen.getByTestId('r').firstElementChild as HTMLElement;

  it('is visible, not clipped, when mounted open', () => {
    render(<Reveal open data-testid="r">x</Reveal>);
    expect(inner()).toHaveClass('overflow-visible');
  });

  it('clips as soon as it closes', () => {
    const { rerender } = render(<Reveal open data-testid="r">x</Reveal>);
    rerender(<Reveal open={false} data-testid="r">x</Reveal>);
    expect(inner()).toHaveClass('overflow-hidden');
  });

  it('stays clipped while opening and unclips on transitionend', () => {
    const { rerender } = render(<Reveal open={false} data-testid="r">x</Reveal>);
    rerender(<Reveal open data-testid="r">x</Reveal>);
    expect(inner()).toHaveClass('overflow-hidden');
    fireEvent.transitionEnd(screen.getByTestId('r'));
    expect(inner()).toHaveClass('overflow-visible');
  });

  it('unclips after a fallback delay when no transition runs', () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<Reveal open={false} data-testid="r">x</Reveal>);
      rerender(<Reveal open data-testid="r">x</Reveal>);
      expect(inner()).toHaveClass('overflow-hidden');
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(inner()).toHaveClass('overflow-visible');
    } finally {
      vi.useRealTimers();
    }
  });

  it('is clipped on the very first render after open flips true', () => {
    const { rerender } = render(<Reveal open data-testid="r">x</Reveal>);
    rerender(<Reveal open={false} data-testid="r">x</Reveal>);
    fireEvent.transitionEnd(screen.getByTestId('r'));
    rerender(<Reveal open data-testid="r">x</Reveal>);
    expect(inner()).toHaveClass('overflow-hidden');
  });

  it('after the fallback delay a closed Reveal reopens clipped even with no transitionend', () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<Reveal open data-testid="r">x</Reveal>);
      rerender(<Reveal open={false} data-testid="r">x</Reveal>);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      rerender(<Reveal open data-testid="r">x</Reveal>);
      expect(inner()).toHaveClass('overflow-hidden');
    } finally {
      vi.useRealTimers();
    }
  });
});
