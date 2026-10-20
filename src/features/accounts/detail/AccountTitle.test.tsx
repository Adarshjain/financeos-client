import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import { AccountTitle } from './AccountTitle';

describe('AccountTitle', () => {
  it('puts the bank logo before the name for a bank account', () => {
    render(<AccountTitle account={{ id: 'b', type: AccountType.BANK_ACCOUNT, name: 'Salary', bank: 'hdfc' } as Account} />);
    expect(screen.getByRole('img', { name: 'HDFC Bank' })).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
  });

  it('puts the bank logo before the name for a credit card', () => {
    render(<AccountTitle account={{ id: 'c', type: AccountType.CREDIT_CARD, name: 'Magnus', bank: 'axis' } as Account} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('shows a letter tile without a bank', () => {
    render(<AccountTitle account={{ id: 'b', type: AccountType.BANK_ACCOUNT, name: 'Salary', bank: null } as Account} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
  });

  it('shows no logo for other types', () => {
    render(<AccountTitle account={{ id: 'k', type: AccountType.BROKER, name: 'Zerodha', bank: 'hdfc' } as unknown as Account} />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});
