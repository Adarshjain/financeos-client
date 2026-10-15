import { render } from '@testing-library/react';
import { ChevronDown } from 'lucide-react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Icon } from './Icon';

describe('Icon', () => {
  it('renders a Lucide icon at md size by default with strokeWidth 2 and aria-hidden', () => {
    const { container } = render(<Icon icon={ChevronDown} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-icon-md', 'h-icon-md');
    expect(svg).toHaveAttribute('stroke-width', '2');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders with size="sm"', () => {
    const { container } = render(<Icon icon={ChevronDown} size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-icon-sm', 'h-icon-sm');
  });

  it('renders with size="lg"', () => {
    const { container } = render(<Icon icon={ChevronDown} size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-icon-lg', 'h-icon-lg');
  });

  it('merges custom className', () => {
    const { container } = render(
      <Icon icon={ChevronDown} className="text-brand-strong" />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-brand-strong');
  });

  it('renders children elements when provided', () => {
    const { container } = render(
      <Icon size="sm">
        <ChevronDown data-testid="child-icon" />
      </Icon>
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-icon-sm', 'h-icon-sm');
    expect(svg).toHaveAttribute('stroke-width', '2');
  });
});
