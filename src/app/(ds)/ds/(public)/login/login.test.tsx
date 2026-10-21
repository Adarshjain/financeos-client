import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { login, startGoogleSSO } from '@/actions/auth';
import { getOptionalSession } from '@/lib/auth';

import { LoginForm } from './LoginForm';
import DsLoginPage from './page';

vi.mock('@/actions/auth', () => ({
  login: vi.fn(),
  startGoogleSSO: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getOptionalSession: vi.fn(),
}));

const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

describe('/ds/login page and LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('redirects signed-in user away to /dashboard or from parameter', async () => {
    vi.mocked(getOptionalSession).mockResolvedValue({
      id: 'usr-1',
      email: 'arjun@example.test',
      admin: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    await expect(
      DsLoginPage({ searchParams: Promise.resolve({ from: '/transactions' }) }),
    ).rejects.toThrow('REDIRECT:/ds/transactions');

    await expect(
      DsLoginPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow('REDIRECT:/dashboard');
  });

  it('empty submit sends nothing and displays validation banner', async () => {
    render(<LoginForm />);

    const submitBtn = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(submitBtn);

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Email and password are required.')).toBeDefined();
    expect(login).not.toHaveBeenCalled();
  });

  it('displays error banner from server and preserves typed email', async () => {
    vi.mocked(login).mockResolvedValue({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'arjun.mehta@example.test' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-pass' } });

    const submitBtn = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Email or password is incorrect.')).toBeDefined();
    });

    expect(emailInput.value).toBe('arjun.mehta@example.test');
  });

  it('shows success banner when ?deleted=1 is present', () => {
    mockSearchParams = new URLSearchParams('deleted=1');
    render(<LoginForm />);

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Your account has been deleted.')).toBeDefined();
  });

  it('guards Google button against double-click and calls startGoogleSSO once', async () => {
    let resolveSSO: (res: any) => void;
    const ssoPromise = new Promise((resolve) => {
      resolveSSO = resolve;
    });
    vi.mocked(startGoogleSSO).mockReturnValue(ssoPromise as any);

    render(<LoginForm />);

    const googleBtn = screen.getByRole('button', { name: /Continue with Google/i });

    // Double click rapidly
    fireEvent.click(googleBtn);
    fireEvent.click(googleBtn);

    expect(startGoogleSSO).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Opening Google…')).toBeDefined();

    resolveSSO!({
      success: true,
      data: { authorizationUrl: 'https://accounts.google.com/o/oauth2' },
    });
  });

  it('disables submit button and shows loading state while submission is pending', async () => {
    let resolveLogin: (res: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    vi.mocked(login).mockReturnValue(loginPromise as any);

    render(<LoginForm />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'arjun@example.test' } });
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });

    const submitBtn = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const busyBtn = screen.getByRole('button', { name: /Signing in…/i });
      expect(busyBtn.getAttribute('aria-busy')).toBe('true');
      expect(busyBtn.hasAttribute('disabled')).toBe(true);
    });

    resolveLogin!({
      success: true,
      data: { id: 'usr-1', email: 'arjun@example.test' },
    });
  });
});
