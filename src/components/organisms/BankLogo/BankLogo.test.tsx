import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { BankLogo } from './BankLogo';

describe('BankLogo', () => {
  it('cuts the bank cell from the sprite', () => {
    render(<BankLogo bankId="hdfc" name="Salary" />);
    const logo = screen.getByRole('img', { name: 'HDFC Bank' });
    expect(logo).toHaveStyle({ backgroundImage: 'url(/banks/sprite.png)', backgroundSize: '1900% 100%' });
    expect(logo.style.backgroundPosition).toBe(`${(8 / 18) * 100}% 0%`);
    expect(logo).toHaveClass('h-space-24', 'w-space-24', 'rounded-ds-sm');
  });

  it('puts the first and last banks at the sprite edges', () => {
    const { rerender } = render(<BankLogo bankId="amex" name="Card" />);
    expect(screen.getByRole('img').style.backgroundPosition).toBe('0% 0%');
    rerender(<BankLogo bankId="yes" name="Card" />);
    expect(screen.getByRole('img').style.backgroundPosition).toBe('100% 0%');
  });

  it('falls back to the first letter for an unknown id', () => {
    render(<BankLogo bankId="nope" name="Nova" />);
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByTestId('bank-missing')).toBeNull();
  });

  it('shows the first letter of the name with no bank id', () => {
    render(<BankLogo bankId={null} name="cash wallet" />);
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('marks an account with no bank with an amber warning at the top right', () => {
    render(<BankLogo bankId={null} name="Cash" />);
    const mark = screen.getByTestId('bank-missing');
    expect(mark).toHaveClass('text-warning', 'absolute', '-top-space-4', '-right-space-4');
  });

  it('shows no warning mark for a bank with a logo', () => {
    render(<BankLogo bankId="hdfc" name="Salary" />);
    expect(screen.queryByTestId('bank-missing')).toBeNull();
  });
});
