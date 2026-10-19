import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { BankLogo } from './BankLogo';

describe('BankLogo', () => {
  it('cuts the bank cell from the sprite', () => {
    render(<BankLogo bankId="hdfc" />);
    const logo = screen.getByRole('img', { name: 'HDFC Bank' });
    expect(logo).toHaveStyle({ backgroundImage: 'url(/banks/sprite.png)', backgroundSize: '1900% 100%' });
    expect(logo.style.backgroundPosition).toBe(`${(8 / 18) * 100}% 0%`);
    expect(logo).toHaveClass('h-space-24', 'w-space-24', 'rounded-ds-sm');
  });

  it('puts the first and last banks at the sprite edges', () => {
    const { rerender } = render(<BankLogo bankId="amex" />);
    expect(screen.getByRole('img').style.backgroundPosition).toBe('0% 0%');
    rerender(<BankLogo bankId="yes" />);
    expect(screen.getByRole('img').style.backgroundPosition).toBe('100% 0%');
  });

  it('falls back to the first letter for an unknown id', () => {
    render(<BankLogo bankId="nope" />);
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
