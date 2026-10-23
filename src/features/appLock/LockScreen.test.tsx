import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const startUnlock = vi.fn();
const finishUnlock = vi.fn();
vi.mock('./actions', () => ({ startUnlock: () => startUnlock(), finishUnlock: (c: unknown) => finishUnlock(c) }));
const logout = vi.fn();
vi.mock('@/actions/auth', () => ({ logoutToDinero: () => logout() }));
vi.mock('./webauthn', () => ({
  toRequestOptions: (o: unknown) => o,
  credentialToJSON: () => ({ id: 'cred' }),
}));

import { LockScreen } from './LockScreen';

const replace = vi.fn();
const get = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'location', { configurable: true, value: { replace } });
  Object.defineProperty(navigator, 'credentials', { configurable: true, value: { get } });
  startUnlock.mockResolvedValue({ success: true, data: { publicKey: {} } });
  get.mockResolvedValue({ id: 'cred' });
});

const fail = (code: string) => ({ success: false, error: { code, message: 'x' } });

describe('LockScreen', () => {
  it('shows the copy, Unlock and Sign out', () => {
    render(<LockScreen from="/ds/loans" />);
    expect(screen.getByText('FinanceOS is locked')).toBeTruthy();
    expect(screen.getByText('Use Face ID or your fingerprint to open the app.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
  });

  it('does not prompt before a tap', () => {
    render(<LockScreen from="/ds/loans" />);
    expect(startUnlock).not.toHaveBeenCalled();
  });

  it('unlocks and returns to the page they were on', async () => {
    finishUnlock.mockResolvedValue({ success: true, data: undefined });
    render(<LockScreen from="/ds/loans" />);
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/ds/loans'));
    expect(finishUnlock).toHaveBeenCalledWith({ id: 'cred' });
  });

  it('shows the error and the way out when the prompt is dismissed', async () => {
    get.mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    render(<LockScreen from="/ds/loans" />);
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(await screen.findByText("Couldn't verify. Try again.")).toBeTruthy();
    expect(screen.getByText(/Can't unlock\? Sign out, sign in with your password/)).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('treats a failed check (403 as data) as an error to retry, not as a sign-out', async () => {
    finishUnlock.mockResolvedValue(fail('APP_LOCK_UNLOCK_FAILED'));
    render(<LockScreen from="/ds/loans" />);
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(await screen.findByText("Couldn't verify. Try again.")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
    // and they can try again
    finishUnlock.mockResolvedValue({ success: true, data: undefined });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/ds/loans'));
  });

  it('goes to sign-in when the session ended (the last allowed failure)', async () => {
    finishUnlock.mockResolvedValue(fail('UNAUTHORIZED'));
    render(<LockScreen from="/ds/loans" />);
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/ds/login'));
  });

  it('says to sign out when this device has no passkey on the server', async () => {
    startUnlock.mockResolvedValue(fail('APP_LOCK_DEVICE_MISSING'));
    render(<LockScreen from="/ds/loans" />);
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(await screen.findByText(/Can't unlock\?/)).toBeTruthy();
    expect(get).not.toHaveBeenCalled();
  });

  it('signs out through the Dinero sign-out', () => {
    render(<LockScreen from="/ds/loans" />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalled();
  });
});
