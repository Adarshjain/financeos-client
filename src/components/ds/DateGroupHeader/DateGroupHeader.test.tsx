import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { DateGroupHeader } from './DateGroupHeader';

describe('DateGroupHeader', () => {
  it('renders day variant with date and weekday', () => {
    render(<DateGroupHeader date="12 Oct" weekday="Mon" />);
    expect(screen.getByText('12 Oct')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
  });

  it('renders month variant with date and summary', () => {
    render(
      <DateGroupHeader
        variant="month"
        date="September 2026"
        summary="61 transactions · out ₹1,05,219"
      />,
    );
    expect(
      screen.getByText(/September 2026 · 61 transactions · out ₹1,05,219/),
    ).toBeInTheDocument();
  });

  it('renders custom children', () => {
    render(<DateGroupHeader>Today</DateGroupHeader>);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('applies sticky class when sticky prop is true', () => {
    const { container } = render(
      <DateGroupHeader date="12 Oct" sticky={true} />,
    );
    expect(container.firstChild).toHaveClass('sticky');
    expect(container.firstChild).toHaveClass('z-sticky');
  });

  it('omits sticky class when sticky prop is false', () => {
    const { container } = render(
      <DateGroupHeader date="12 Oct" sticky={false} />,
    );
    expect(container.firstChild).not.toHaveClass('sticky');
  });
});
