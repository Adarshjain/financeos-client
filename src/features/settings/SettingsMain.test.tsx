import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { AppLockStatus } from '@/lib/api/types';
import type { UserResponse } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

const logout = vi.fn();
vi.mock('@/actions/auth', () => ({ logoutToDinero: (...a: unknown[]) => logout(...a) }));
vi.mock('./profile/ProfileCard', () => ({ ProfileCard: () => <div data-testid="profile-card" /> }));
vi.mock('./profile/DeleteAccountCard', () => ({ DeleteAccountCard: () => <div data-testid="delete-card" /> }));
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }) }));
vi.mock('@/features/app-lock/appLockActions', () => ({}));
vi.mock('@/features/app-lock/webauthn', () => ({
  isPlatformAuthAvailable: async () => true,
  hostMatchesRp: () => true,
}));

import { SettingsMain } from './SettingsMain';

const user = { email: 'a@b.c', displayName: 'A B', pictureUrl: null, hasPassword: true } as UserResponse;
const appLock = { armed: true, locked: false, lockAfterSeconds: 60, rpId: 'localhost', heartbeatSeconds: 15 } as AppLockStatus;
const settled = <T,>(value: T): Promise<T> => Object.assign(Promise.resolve(value), { status: 'fulfilled', value });

function renderMain(values = { aiKeyCount: 2 as number | undefined }) {
  return renderWithQuery(
    <SettingsMain
      user={user}
      appLock={appLock}
      values={{ aiKeyCount: settled(values.aiKeyCount) }}
    />,
  );
}

const card = (title: string) => screen.getByText(title, { selector: 'h2, h3, div, span, p' }).closest('section, div[class*="rounded"]') as HTMLElement;

describe('SettingsMain', () => {
  it('stacks Profile, General, Security, Data, Help, Sign out, Delete', () => {
    renderMain();
    const order = [
      screen.getByTestId('profile-card'),
      screen.getByText('General'),
      screen.getByText('Security'),
      screen.getByText('Data'),
      screen.getByText('Help'),
      screen.getByRole('button', { name: 'Sign out' }),
      screen.getByTestId('delete-card'),
    ];
    for (let i = 0; i < order.length - 1; i++) {
      expect(order[i].compareDocumentPosition(order[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('puts Theme and Notifications in General', () => {
    renderMain();
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Notifications/ })).toHaveAttribute('href', '/settings/notifications');
    expect(card('General')).toContainElement(screen.getByRole('radiogroup', { name: 'Theme' }));
  });

  it('puts App lock (switch and Lock after when armed) and Hide amounts in Security', () => {
    renderMain();
    const security = card('Security');
    expect(within(security).getByRole('switch', { name: 'Unlock with Face ID or fingerprint' })).toBeInTheDocument();
    expect(within(security).getByRole('combobox', { name: 'Lock after' })).toBeInTheDocument();
    expect(within(security).getByText('Hide amounts')).toBeInTheDocument();
  });

  it('links AI with its key count; Connections and Activity moved to Data sources', () => {
    renderMain();
    const data = card('Data');
    expect(within(data).queryByRole('link', { name: /Connections/ })).toBeNull();
    expect(within(data).getByRole('link', { name: /AI/ })).toHaveAttribute('href', '/settings/ai');
    expect(within(data).getByText('2 keys')).toBeInTheDocument();
  });

  it('hides a value whose request failed', () => {
    renderMain({ aiKeyCount: undefined });
    expect(screen.queryByText(/keys?$/)).toBeNull();
  });

  it('links Debug and a full-load Storybook in Help', () => {
    renderMain();
    const help = card('Help');
    expect(within(help).queryByRole('link', { name: /Activity/ })).toBeNull();
    expect(within(help).getByRole('link', { name: /Debug/ })).toHaveAttribute('href', '/settings/debug');
    const storybook = within(help).getByRole('link', { name: /Storybook/ });
    expect(storybook).toHaveAttribute('href', '/storybook');
    expect(storybook).toHaveTextContent('Every Dinero component, live');
  });

  it('Sign out is a full-width row submitting the logout form', async () => {
    const { container } = renderMain();
    const signOut = screen.getByRole('button', { name: 'Sign out' });
    expect(signOut.getAttribute('type')).toBe('submit');
    expect(signOut.closest('form')).not.toBeNull();
    expect(signOut.className).toContain('w-full');
    expect(container.querySelectorAll('form')).toHaveLength(1);
    fireEvent.click(signOut);
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });
});
