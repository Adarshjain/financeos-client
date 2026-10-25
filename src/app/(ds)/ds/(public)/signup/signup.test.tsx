import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signup, startGoogleSSO } from '@/actions/auth';
import { getOptionalSession } from '@/lib/auth';

import DsSignupPage from './page';
import { SignupForm } from './SignupForm';

vi.mock('@/actions/auth', () => ({
  signup: vi.fn(),
  startGoogleSSO: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getOptionalSession: vi.fn(),
}));

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

describe('/ds/signup page and SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects signed-in user away to /ds/dashboard', async () => {
    vi.mocked(getOptionalSession).mockResolvedValue({
      id: 'usr-1',
      email: 'arjun@example.test',
      admin: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await expect(DsSignupPage()).rejects.toThrow('REDIRECT:/ds/dashboard');
  });

  it('renders initial form with info banner and form fields', () => {
    render(<SignupForm />);

    expect(
      screen.getByText(
        "FinanceOS is invite-only — you'll need a code to sign up.",
      ),
    ).toBeDefined();
    expect(screen.getByLabelText('Invite code')).toBeDefined();
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Sign up with Google' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Create account' }),
    ).toBeDefined();
  });

  it('rejects password shorter than 8 characters before submitting', () => {
    render(<SignupForm />);

    const inviteInput = screen.getByLabelText('Invite code');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitBtn = screen.getByRole('button', { name: 'Create account' });

    fireEvent.change(inviteInput, { target: { value: 'SECRET123' } });
    fireEvent.change(emailInput, { target: { value: 'arjun@example.test' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.click(submitBtn);

    expect(
      screen.getByText('Password must be at least 8 characters.'),
    ).toBeDefined();
    expect(signup).not.toHaveBeenCalled();
  });

  it('displays danger banner when server rejects invite code', async () => {
    vi.mocked(signup).mockResolvedValue({
      success: false,
      error: {
        code: 'INVALID_INVITE_CODE',
        message: 'That invite code is not valid.',
      },
    });

    render(<SignupForm />);

    const inviteInput = screen.getByLabelText('Invite code');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitBtn = screen.getByRole('button', { name: 'Create account' });

    fireEvent.change(inviteInput, { target: { value: 'BADCODE' } });
    fireEvent.change(emailInput, { target: { value: 'arjun@example.test' } });
    fireEvent.change(passwordInput, { target: { value: 'validpassword123' } });

    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(
        screen.getByText('That invite code is not valid.'),
      ).toBeDefined();
    });
  });

  it('displays success banner and redirects to /ds/dashboard upon successful signup', async () => {
    vi.mocked(signup).mockResolvedValue({
      success: true,
      data: {
        id: 'usr-new',
        email: 'arjun@example.test',
        admin: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });

    render(<SignupForm />);

    const inviteInput = screen.getByLabelText('Invite code');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitBtn = screen.getByRole('button', { name: 'Create account' });

    fireEvent.change(inviteInput, { target: { value: 'INVITE2026' } });
    fireEvent.change(emailInput, { target: { value: 'arjun@example.test' } });
    fireEvent.change(passwordInput, { target: { value: 'validpassword123' } });

    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(
        screen.getByText('Account created! Redirecting…'),
      ).toBeDefined();
      expect(mockPush).toHaveBeenCalledWith('/ds/dashboard');
    });
  });

  it('guards Google SSO button against double click', async () => {
    vi.mocked(startGoogleSSO).mockReturnValue(new Promise(() => {}));

    render(<SignupForm />);

    const googleBtn = screen.getByRole('button', {
      name: 'Sign up with Google',
    });
    fireEvent.click(googleBtn);
    fireEvent.click(googleBtn);

    expect(startGoogleSSO).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Opening Google…')).toBeDefined();
  });
});
