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
  // The prompt the screen opens on its own is refused (as Safari does without a tap) unless a test says otherwise.
  get.mockRejectedValueOnce(new DOMException('no gesture', 'NotAllowedError'));
});

/** Unlock, once the automatic prompt has settled. */
const unlockButton = () => screen.findByRole('button', { name: 'Unlock' });

const fail = (code: string) => ({ success: false, error: { code, message: 'x' } });

describe('LockScreen', () => {
  it('shows the copy, Unlock and Sign out', async () => {
    render(<LockScreen from="/loans" />);
    expect(screen.getByText('FinanceOS is locked')).toBeTruthy();
    expect(screen.getByText('Use Face ID or your fingerprint to open the app.')).toBeTruthy();
    expect(await unlockButton()).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
  });

  it('opens the prompt on its own and unlocks without a tap', async () => {
    get.mockReset();
    get.mockResolvedValue({ id: 'cred' });
    finishUnlock.mockResolvedValue({ success: true, data: undefined });
    render(<LockScreen from="/loans" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/loans'));
    expect(startUnlock).toHaveBeenCalledTimes(1);
  });

  it('a refused or dismissed automatic prompt shows no error and leaves Unlock to tap', async () => {
    render(<LockScreen from="/loans" />);
    expect(await unlockButton()).toBeTruthy();
    expect(get).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Couldn't verify. Try again.")).toBeNull();
  });

  it('prompts again when the app comes back after a while, not after a blink', async () => {
    const now = vi.spyOn(Date, 'now');
    let visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
    const flip = (state: string, at: number) => {
      visibility = state;
      now.mockReturnValue(at);
      fireEvent(document, new Event('visibilitychange'));
    };
    get.mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    render(<LockScreen from="/loans" />);
    await unlockButton();
    expect(startUnlock).toHaveBeenCalledTimes(1);
    flip('hidden', 1000);
    flip('visible', 1500);
    await unlockButton();
    expect(startUnlock).toHaveBeenCalledTimes(1);
    flip('hidden', 10_000);
    flip('visible', 20_000);
    await waitFor(() => expect(startUnlock).toHaveBeenCalledTimes(2));
    await unlockButton();
    now.mockRestore();
  });

  it('unlocks and returns to the page they were on', async () => {
    finishUnlock.mockResolvedValue({ success: true, data: undefined });
    render(<LockScreen from="/loans" />);
    fireEvent.click(await unlockButton());
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/loans'));
    expect(finishUnlock).toHaveBeenCalledWith({ id: 'cred' });
  });

  it('shows the error and the way out when the prompt is dismissed', async () => {
    get.mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    render(<LockScreen from="/loans" />);
    fireEvent.click(await unlockButton());
    expect(await screen.findByText("Couldn't verify. Try again.")).toBeTruthy();
    expect(screen.getByText(/Can't unlock\? Sign out, sign in with your password/)).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('treats a failed check (403 as data) as an error to retry, not as a sign-out', async () => {
    finishUnlock.mockResolvedValue(fail('APP_LOCK_UNLOCK_FAILED'));
    render(<LockScreen from="/loans" />);
    fireEvent.click(await unlockButton());
    expect(await screen.findByText("Couldn't verify. Try again.")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
    // and they can try again
    finishUnlock.mockResolvedValue({ success: true, data: undefined });
    fireEvent.click(await unlockButton());
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/loans'));
  });

  it('goes to sign-in when the session ended (the last allowed failure)', async () => {
    finishUnlock.mockResolvedValue(fail('UNAUTHORIZED'));
    render(<LockScreen from="/loans" />);
    fireEvent.click(await unlockButton());
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('says to sign out when this device has no passkey on the server', async () => {
    startUnlock.mockResolvedValue(fail('APP_LOCK_DEVICE_MISSING'));
    render(<LockScreen from="/loans" />);
    fireEvent.click(await unlockButton());
    expect(await screen.findByText(/Can't unlock\?/)).toBeTruthy();
    expect(get).not.toHaveBeenCalled();
  });

  it('signs out through the Dinero sign-out', () => {
    render(<LockScreen from="/loans" />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalled();
  });
});
