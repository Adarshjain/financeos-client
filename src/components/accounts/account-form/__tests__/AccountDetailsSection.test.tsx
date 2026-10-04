import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AccountType } from '@/lib/types';

import { AccountDetailsSection } from '../AccountDetailsSection';

function renderSection(accountType: AccountType, showPassword: boolean) {
  const setShowPassword = vi.fn();
  render(
    <AccountDetailsSection
      accountType={accountType}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
    />
  );
  return { setShowPassword, input: screen.getByLabelText('Statement Password (Optional)') };
}

describe('AccountDetailsSection statement password', () => {
  it.each([AccountType.BANK_ACCOUNT, AccountType.CREDIT_CARD])(
    'masks the password by default for %s',
    (accountType) => {
      const { input } = renderSection(accountType, false);
      expect(input).toHaveAttribute('type', 'password');
      expect(screen.getByRole('button', { name: 'Show statement password' })).toBeInTheDocument();
    }
  );

  it.each([AccountType.BANK_ACCOUNT, AccountType.CREDIT_CARD])(
    'reveals the password as plain text when toggled on for %s',
    (accountType) => {
      const { input } = renderSection(accountType, true);
      expect(input).toHaveAttribute('type', 'text');
      expect(screen.getByRole('button', { name: 'Hide statement password' })).toBeInTheDocument();
    }
  );

  it('flips the visibility state when the eye button is clicked', () => {
    const { setShowPassword } = renderSection(AccountType.BANK_ACCOUNT, false);
    fireEvent.click(screen.getByRole('button', { name: 'Show statement password' }));
    expect(setShowPassword).toHaveBeenCalledTimes(1);
    const updater = setShowPassword.mock.calls[0][0] as (prev: boolean) => boolean;
    expect(updater(false)).toBe(true);
    expect(updater(true)).toBe(false);
  });

  it('opts the field out of saved-login autofill', () => {
    const { input } = renderSection(AccountType.CREDIT_CARD, false);
    expect(input).toHaveAttribute('autocomplete', 'new-password');
    expect(input).toHaveAttribute('data-1p-ignore');
    expect(input).toHaveAttribute('data-lpignore', 'true');
    expect(input).toHaveAttribute('name', 'statementPassword');
  });

  it('has no statement password field for broker accounts', () => {
    render(
      <AccountDetailsSection
        accountType={AccountType.BROKER}
        showPassword={false}
        setShowPassword={vi.fn()}
      />
    );
    expect(screen.queryByLabelText('Statement Password (Optional)')).not.toBeInTheDocument();
  });
});
