import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { UserResponse } from '@/lib/types';

import { ProfileScreen } from './ProfileScreen';

const logout = vi.fn();
vi.mock('@/actions/auth', () => ({ logoutToDinero: (...a: unknown[]) => logout(...a) }));
vi.mock('./ProfileCard', () => ({ ProfileCard: () => <div data-testid="profile-card" /> }));
vi.mock('./DeleteAccountCard', () => ({ DeleteAccountCard: () => <div data-testid="delete-card" /> }));

const user = { email: 'a@b.c', displayName: 'A B', pictureUrl: null, hasPassword: true } as UserResponse;

describe('ProfileScreen', () => {
  it('stacks the profile card, Sign out, then the delete-account card', () => {
    render(<ProfileScreen user={user} />);
    const profile = screen.getByTestId('profile-card');
    const signOut = screen.getByRole('button', { name: 'Sign out' });
    const del = screen.getByTestId('delete-card');
    expect(profile.compareDocumentPosition(signOut) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(signOut.compareDocumentPosition(del) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('runs the sign out action', async () => {
    render(<ProfileScreen user={user} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });
});
