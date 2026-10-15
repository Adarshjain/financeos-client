import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Illustration } from './Illustration';

describe('Illustration component', () => {
  it('renders signin variant with scene elements and headline', () => {
    const { container } = render(<Illustration variant="signin" />);
    expect(
      screen.getByText('Every rupee, every card, every loan. One calm ledger.'),
    ).toBeInTheDocument();
    expect(screen.getByText('HDFC REGALIA GOLD')).toBeInTheDocument();
    expect(screen.getByText('Net worth')).toBeInTheDocument();
    expect(screen.getByText('₹11.98L')).toBeInTheDocument();
    expect(screen.getByText('Amex bill paid')).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders signup variant with setup steps and tiles', () => {
    render(<Illustration variant="signup" />);
    expect(
      screen.getByText('Set up takes about ten minutes.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Regalia statement')).toBeInTheDocument();
    expect(screen.getByText('Gmail connected')).toBeInTheDocument();
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByText('Add a bank and a card')).toBeInTheDocument();
    expect(screen.getByText('Connect Gmail')).toBeInTheDocument();
  });

  it('renders offline variant with sleeping rupee and cloud', () => {
    render(<Illustration variant="offline" />);
    expect(screen.getByText('₹')).toBeInTheDocument();
    expect(screen.getByText('z z')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(
      <Illustration variant="offline" className="custom-ill-class" />,
    );
    expect(container.firstChild).toHaveClass('custom-ill-class');
  });
});
