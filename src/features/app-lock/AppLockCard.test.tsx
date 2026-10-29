import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery as render } from '@/test/renderWithQuery';

const actions = vi.hoisted(() => ({
  startEnrolment: vi.fn(),
  finishEnrolment: vi.fn(),
  updateLockAfter: vi.fn(),
  disableAppLock: vi.fn(),
  startUnlock: vi.fn(),
}));
vi.mock('./appLockActions', () => actions);

const web = vi.hoisted(() => ({ platform: true, hostOk: true }));
vi.mock('./webauthn', () => ({
  isPlatformAuthAvailable: async () => web.platform,
  hostMatchesRp: () => web.hostOk,
  toCreationOptions: (o: unknown) => o,
  toRequestOptions: (o: unknown) => o,
  credentialToJSON: () => ({ id: 'cred' }),
  isCancelled: (e: unknown) => e instanceof DOMException && e.name === 'NotAllowedError',
}));

const showToast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => showToast(...args),
}));

import type { AppLockStatus } from '@/lib/api/types';
import { APP_LOCK_CHANGED_EVENT } from '@/lib/appLock';

import { AppLockCard } from './AppLockCard';

const off: AppLockStatus = { armed: false, locked: false, lockAfterSeconds: null, rpId: 'localhost', heartbeatSeconds: 15 };
const on: AppLockStatus = { ...off, armed: true, lockAfterSeconds: 60 };
const create = vi.fn();
const get = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  web.platform = true;
  web.hostOk = true;
  Object.defineProperty(navigator, 'credentials', { configurable: true, value: { create, get } });
  create.mockResolvedValue({ id: 'cred' });
  get.mockResolvedValue({ id: 'cred' });
  actions.startUnlock.mockResolvedValue({ success: true, data: { publicKey: {} } });
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

  it('turns off after asking for the passkey again and sends it', async () => {
    render(<AppLockCard status={on} />);
    fireEvent.click(toggle());
    await waitFor(() => expect(toggle().getAttribute('aria-checked')).toBe('false'));
    expect(actions.startUnlock).toHaveBeenCalled();
    expect(get).toHaveBeenCalled();
    expect(actions.disableAppLock).toHaveBeenCalledWith({ id: 'cred' });
    expect(screen.queryByText('Lock after')).toBeNull();
  });

  it('stays on, with no toast, when the passkey prompt is dismissed on turning off', async () => {
    get.mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    render(<AppLockCard status={on} />);
    fireEvent.click(toggle());
    await waitFor(() => expect(get).toHaveBeenCalled());
    await waitFor(() => expect((toggle() as HTMLButtonElement).disabled).toBe(false));
    expect(actions.disableAppLock).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(toggle().getAttribute('aria-checked')).toBe('true');
  });

  it('stays on, with no toast, when no passkey comes back on turning off', async () => {
    get.mockResolvedValue(null);
    render(<AppLockCard status={on} />);
    fireEvent.click(toggle());
    await waitFor(() => expect(get).toHaveBeenCalled());
    await waitFor(() => expect((toggle() as HTMLButtonElement).disabled).toBe(false));
    expect(actions.disableAppLock).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(toggle().getAttribute('aria-checked')).toBe('true');
  });

  it('stays on and shows the message when the server refuses the passkey', async () => {
    actions.disableAppLock.mockResolvedValue({
      success: false,
      error: { code: 'APP_LOCK_UNLOCK_FAILED', message: "Couldn't verify. Try again." },
    });
    render(<AppLockCard status={on} />);
    fireEvent.click(toggle());
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Couldn't verify. Try again.", { tone: 'danger' }));
    expect(toggle().getAttribute('aria-checked')).toBe('true');
  });

  it('stays on and shows the message when the passkey request cannot start', async () => {
    actions.startUnlock.mockResolvedValue({ success: false, error: { code: 'X', message: 'Could not start unlock' } });
    render(<AppLockCard status={on} />);
    fireEvent.click(toggle());
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Could not start unlock', { tone: 'danger' }));
    expect(get).not.toHaveBeenCalled();
    expect(toggle().getAttribute('aria-checked')).toBe('true');
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
