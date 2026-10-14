import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders with default tokens and aria-hidden', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass(
      'bg-line-soft',
      'rounded-ds-xs',
      'h-space-12',
      'animate-pulse',
    );
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders circular avatar placeholder when circle is true', () => {
    const { container } = render(<Skeleton circle width={32} height={32} />);
    expect(container.firstChild).toHaveClass('rounded-ds-pill', 'aspect-square');
  });

  it('applies custom dimensions', () => {
    const { container } = render(<Skeleton width="60%" height={20} />);
    expect(container.firstChild).toHaveStyle({
      width: '60%',
      height: '20px',
    });
  });
});
