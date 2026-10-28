'use server';

import { cookies } from 'next/headers';

import type { AppLockStatus } from '@/lib/api/types';
import { appLockApi, type WebAuthnOptionsJson } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';

const DEVICE_COOKIE = 'FINANCEOS_DEVICE';

/** The device cookie names this device's app-lock row; it outlives sign-out so a password sign-in re-arms the lock. */
async function setDeviceCookie(deviceId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

async function clearDeviceCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEVICE_COOKIE);
}

export const getAppLockStatus = createDomainAction(
  { fallbackError: 'Could not read app lock' },
  async (): Promise<AppLockStatus> => appLockApi.status(),
);

export const startEnrolment = createDomainAction(
  { fallbackError: 'Could not start app lock setup' },
  async (lockAfterSeconds: number): Promise<WebAuthnOptionsJson> => appLockApi.registrationOptions(lockAfterSeconds),
);

/** Verifies the new passkey, then keeps the (possibly new) device id in the device cookie. */
export const finishEnrolment = createDomainAction(
  { fallbackError: 'Could not turn on app lock' },
  async (credential: unknown, label?: string): Promise<{ deviceId: string }> => {
    const result = await appLockApi.registrationVerify(credential, label);
    await setDeviceCookie(result.deviceId);
    return result;
  },
);

export const updateLockAfter = createDomainAction(
  { fallbackError: 'Could not change when the app locks' },
  async (lockAfterSeconds: number): Promise<void> => appLockApi.updateSettings(lockAfterSeconds),
);

export const disableAppLock = createDomainAction(
  { fallbackError: 'Could not turn off app lock' },
  async (credential: unknown): Promise<void> => {
    await appLockApi.disable(credential);
    await clearDeviceCookie();
  },
);

export const startUnlock = createDomainAction(
  { fallbackError: 'Could not start unlock' },
  async (): Promise<WebAuthnOptionsJson> => appLockApi.unlockOptions(),
);

export const finishUnlock = createDomainAction(
  { fallbackError: 'Could not unlock' },
  async (credential: unknown): Promise<void> => appLockApi.unlockVerify(credential),
);
