import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Divider } from './Divider';

describe('Divider component', () => {
  it('renders plain 1px rule with role="separator" and bg-line', () => {
    const { container } = render(<Divider />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute('role', 'separator');
    expect(el).toHaveClass('h-px', 'bg-line');
  });

  it('renders centered label when label prop is provided', () => {
    render(<Divider label="or" />);
    expect(screen.getByText('or')).toBeInTheDocument();
    expect(screen.getByText('or')).toHaveClass('shrink-0');
  });

  it('renders centered label when children are provided', () => {
    render(<Divider>Continue with</Divider>);
    expect(screen.getByText('Continue with')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(<Divider className="my-space-16" />);
    expect(container.firstChild).toHaveClass('my-space-16');
  });
});
