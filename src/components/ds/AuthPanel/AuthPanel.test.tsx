import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AuthPanel } from './AuthPanel';

describe('AuthPanel', () => {
  it('renders login mode by default', () => {
    render(<AuthPanel />);
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
    expect(
      screen.getByText('Sign in to see your money in one place.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /continue with google/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^sign in$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/invite code/i)).not.toBeInTheDocument();
  });

  it('renders signup mode with invite code', () => {
    render(<AuthPanel mode="signup" />);
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(
      screen.getByText('You will need an invite code.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create account/i }),
    ).toBeInTheDocument();
  });

  it('sets autoComplete attributes on inputs', () => {
    const { rerender } = render(<AuthPanel mode="login" />);
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute(
      'autocomplete',
      'email',
    );
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute(
      'autocomplete',
      'current-password',
    );

    rerender(<AuthPanel mode="signup" />);
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
    expect(screen.getByLabelText(/invite code/i)).toHaveAttribute(
      'autocomplete',
      'one-time-code',
    );
  });

  it('handles form submission with credentials', () => {
    const handleSubmit = vi.fn();
    render(
      <AuthPanel
        mode="login"
        email="test@example.com"
        password="secretpassword"
        onSubmit={handleSubmit}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /^sign in$/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'secretpassword',
      inviteCode: undefined,
    });
  });

  it('calls onGoogleSignIn when Google button is clicked', () => {
    const handleGoogle = vi.fn();
    render(<AuthPanel onGoogleSignIn={handleGoogle} />);

    const googleBtn = screen.getByRole('button', {
      name: /continue with google/i,
    });
    fireEvent.click(googleBtn);
    expect(handleGoogle).toHaveBeenCalledTimes(1);
  });

  it('calls onSwitchMode when footer link is clicked', () => {
    const handleSwitch = vi.fn();
    render(<AuthPanel mode="login" onSwitchMode={handleSwitch} />);

    const switchBtn = screen.getByRole('button', {
      name: /create an account/i,
    });
    fireEvent.click(switchBtn);
    expect(handleSwitch).toHaveBeenCalledWith('signup');
  });

  it('renders split desktop layout', () => {
    const { container } = render(<AuthPanel layout="split" />);
    expect(container.firstChild).toHaveClass('lg:grid-cols-2');
  });
});
