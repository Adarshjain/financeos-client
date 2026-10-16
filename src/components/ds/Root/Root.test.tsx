import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Root } from './Root';

describe('Root component', () => {
  it('renders children correctly', () => {
    render(
      <Root>
        <div>Root Child Content</div>
      </Root>,
    );
    expect(screen.getByText('Root Child Content')).toBeInTheDocument();
  });

  it('applies viewport and brand foundation classes', () => {
    const { container } = render(
      <Root>
        <div>Content</div>
      </Root>,
    );
    const rootEl = container.firstChild as HTMLElement;
    expect(rootEl).toHaveClass('min-h-dvh', 'bg-canvas', 'font-text', 'text-ink');
  });

  it('mounts the Dinero Toaster with id="ds"', () => {
    const { container } = render(
      <Root>
        <div>Content</div>
      </Root>,
    );
    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(container.querySelector('section[aria-label^="Notifications"]')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Root ref={ref}>
        <div>Ref target</div>
      </Root>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges custom layout className', () => {
    const { container } = render(
      <Root className="p-space-16">
        <div>Content</div>
      </Root>,
    );
    const rootEl = container.firstChild as HTMLElement;
    expect(rootEl).toHaveClass('min-h-dvh', 'bg-canvas', 'font-text', 'text-ink', 'p-space-16');
  });
});
