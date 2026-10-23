import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({
  startEnrolment: vi.fn(),
  finishEnrolment: vi.fn(),
  updateLockAfter: vi.fn(),
  disableAppLock: vi.fn(),
}));
vi.mock('./actions', () => actions);

const web = vi.hoisted(() => ({ platform: true, hostOk: true }));
vi.mock('./webauthn', () => ({
  isPlatformAuthAvailable: async () => web.platform,
  hostMatchesRp: () => web.hostOk,
  toCreationOptions: (o: unknown) => o,
  credentialToJSON: () => ({ id: 'cred' }),
  isCancelled: (e: unknown) => e instanceof DOMException && e.name === 'NotAllowedError',
}));

import type { AppLockStatus } from '@/lib/api/types';
import { APP_LOCK_CHANGED_EVENT } from '@/lib/appLock';

import { AppLockCard } from './AppLockCard';

const off: AppLockStatus = { armed: false, locked: false, lockAfterSeconds: null, rpId: 'localhost', heartbeatSeconds: 15 };
const on: AppLockStatus = { ...off, armed: true, lockAfterSeconds: 60 };
const create = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  web.platform = true;
  web.hostOk = true;
  Object.defineProperty(navigator, 'credentials', { configurable: true, value: { create } });
  create.mockResolvedValue({ id: 'cred' });
  actions.startEnrolment.mockResolvedValue({ success: true, data: { publicKey: {} } });
  actions.finishEnrolment.mockResolvedValue({ success: true, data: { deviceId: 'd' } });
  actions.updateLockAfter.mockResolvedValue({ success: true, data: undefined });
  actions.disableAppLock.mockResolvedValue({ success: true, data: undefined });
});

const toggle = () => screen.getByRole('switch', { name: 'Unlock with Face ID or fingerprint' });

describe('AppLockCard', () => {
  it('when off shows the switch off and no Lock after', async () => {
    render(<AppLockCard status={off} />);
    await waitFor(() => expect((toggle() as HTMLButtonElement).disabled).toBe(false));
    expect(toggle().getAttribute('aria-checked')).toBe('false');
    expect(screen.queryByText('Lock after')).toBeNull();
  });

  it('when on shows Lock after with the saved choice', () => {
    render(<AppLockCard status={on} />);
    expect(toggle().getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Lock after')).toBeTruthy();
    expect(screen.getByText('1 minute')).toBeTruthy();
  });

  it('offers the four choices', () => {
    render(<AppLockCard status={on} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Lock after' }));
    for (const label of ['Immediately', '5 minutes', '15 minutes']) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getAllByText('1 minute').length).toBeGreaterThan(0);
  });

  it('is disabled with a reason when the device has no platform authenticator', async () => {
    web.platform = false;
    render(<AppLockCard status={off} />);
    expect(await screen.findByText('This device has no Face ID or fingerprint to use')).toBeTruthy();
    expect((toggle() as HTMLButtonElement).disabled).toBe(true);
  });

  it('is disabled with a reason on an address the passkey cannot be used on', async () => {
    web.hostOk = false;
    render(<AppLockCard status={off} />);
    expect(await screen.findByText('Open FinanceOS at its usual address to turn this on')).toBeTruthy();
    expect((toggle() as HTMLButtonElement).disabled).toBe(true);
  });

  it('turns on: options, passkey, verify, then tells the watcher', async () => {
    const changed = vi.fn();
    window.addEventListener(APP_LOCK_CHANGED_EVENT, changed);
    render(<AppLockCard status={off} />);
    await waitFor(() => expect((toggle() as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(toggle());
    await waitFor(() => expect(toggle().getAttribute('aria-checked')).toBe('true'));
    expect(actions.startEnrolment).toHaveBeenCalledWith(60);
    expect(actions.finishEnrolment).toHaveBeenCalledWith({ id: 'cred' });
    expect(changed).toHaveBeenCalled();
    expect(screen.getByText('Lock after')).toBeTruthy();
    window.removeEventListener(APP_LOCK_CHANGED_EVENT, changed);
  });

  it('stays off when the prompt is dismissed', async () => {
    create.mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    render(<AppLockCard status={off} />);
    await waitFor(() => expect((toggle() as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(toggle());
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(actions.finishEnrolment).not.toHaveBeenCalled();
    expect(toggle().getAttribute('aria-checked')).toBe('false');
  });

  it('turns off', async () => {
    render(<AppLockCard status={on} />);
    fireEvent.click(toggle());
    await waitFor(() => expect(toggle().getAttribute('aria-checked')).toBe('false'));
    expect(actions.disableAppLock).toHaveBeenCalled();
    expect(screen.queryByText('Lock after')).toBeNull();
  });

  it('can still be turned off on a device that cannot enrol', async () => {
    web.platform = false;
    render(<AppLockCard status={on} />);
    expect((toggle() as HTMLButtonElement).disabled).toBe(false);
  });

  it('raises the app-locked event when an action says the app is locked', async () => {
    const locked = vi.fn();
    window.addEventListener('financeos:app-locked', locked);
    actions.updateLockAfter.mockResolvedValue({ success: false, error: { code: 'APP_LOCKED', message: 'locked' } });
    render(<AppLockCard status={on} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Lock after' }));
    fireEvent.click(screen.getByText('5 minutes'));
    await waitFor(() => expect(locked).toHaveBeenCalled());
    window.removeEventListener('financeos:app-locked', locked);
  });

  it('saves a new Lock after value', async () => {
    render(<AppLockCard status={on} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Lock after' }));
    fireEvent.click(screen.getByText('5 minutes'));
    await waitFor(() => expect(actions.updateLockAfter).toHaveBeenCalledWith(300));
  });
});
