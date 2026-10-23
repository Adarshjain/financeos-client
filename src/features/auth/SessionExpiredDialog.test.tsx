import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isAuthExpiredClaimed } from '@/lib/authExpiry';

import { SessionExpiredDialog } from './SessionExpiredDialog';

const login = vi.fn();
const logoutToDinero = vi.fn();
vi.mock('@/actions/auth', () => ({
  login: (...a: unknown[]) => login(...a),
  logoutToDinero: (...a: unknown[]) => logoutToDinero(...a),
}));
const refresh = vi.fn();
const router = { refresh };
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const expire = () => act(() => void window.dispatchEvent(new CustomEvent('financeos:auth-expired')));

function setup(email?: string) {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <SessionExpiredDialog email={email} />
    </QueryClientProvider>
  );
  return { invalidate };
}

beforeEach(() => {
  login.mockReset();
  logoutToDinero.mockReset();
  refresh.mockReset();
});

describe('SessionExpiredDialog', () => {
  it('is closed until a 401 happens, and claims the event so nothing navigates away', () => {
    setup('a@example.test');
    expect(screen.queryByText('Sign in again')).toBeNull();
    expect(isAuthExpiredClaimed()).toBe(true);
  });

  it('opens one dialog however many 401s arrive, with the email read-only', async () => {
    setup('a@example.test');
    await expire();
    await expire();
    await expire();
    expect(screen.getAllByText('Sign in again')).toHaveLength(1);
    const email = screen.getByLabelText('Email') as HTMLInputElement;
    expect(email.value).toBe('a@example.test');
    expect(email).toHaveAttribute('readonly');
  });

  it('lets the email be typed when it is not known', async () => {
    setup();
    await expire();
    const email = screen.getByLabelText('Email') as HTMLInputElement;
    expect(email).not.toHaveAttribute('readonly');
    fireEvent.change(email, { target: { value: 'b@example.test' } });
    expect(email.value).toBe('b@example.test');
  });

  it('signs in, closes, refreshes the page and invalidates queries', async () => {
    login.mockResolvedValue({ success: true, data: { email: 'a@example.test' } });
    const { invalidate } = setup('a@example.test');
    await expire();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    const formData = login.mock.calls[0][1] as FormData;
    expect(formData.get('email')).toBe('a@example.test');
    expect(formData.get('password')).toBe('secret');
    expect(invalidate).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Sign in again')).toBeNull());
  });

  it('shows the login error inline and stays open', async () => {
    login.mockResolvedValue({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Wrong email or password', timestamp: 'x' },
    });
    setup('a@example.test');
    await expire();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Wrong email or password')).toBeInTheDocument();
    expect(screen.getByText('Sign in again')).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('Sign out signs out to the Dinero login', async () => {
    setup('a@example.test');
    await expire();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(logoutToDinero).toHaveBeenCalledTimes(1);
  });
});
