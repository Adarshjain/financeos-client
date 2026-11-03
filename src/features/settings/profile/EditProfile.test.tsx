import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConcealProvider } from '@/components/ds/Conceal/Conceal';
import type { UserResponse } from '@/lib/types';

import { EditProfile } from './EditProfile';
import { ProfileCard } from './ProfileCard';

vi.mock('@/actions/auth', () => ({ logoutToDinero: vi.fn() }));
const updateProfile = vi.fn();
vi.mock('./editProfileActions', () => ({ updateProfile: (...a: unknown[]) => updateProfile(...a) }));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const user = {
  email: 'asha@example.test',
  displayName: 'Asha Rao',
  pictureUrl: null,
  hasPassword: false,
  birthDate: '1990-04-05',
  birthDateSource: 'TYPED',
} as UserResponse;

beforeEach(() => {
  updateProfile.mockReset().mockResolvedValue({ success: true, data: undefined });
});

describe('EditProfile', () => {
  it('opens with the saved name and date and saves them', async () => {
    render(<EditProfile user={user} today="2026-11-03" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const name = screen.getByLabelText('Your name, as your bank prints it');
    expect(name).toHaveValue('Asha Rao');
    expect(screen.getByLabelText('Date of birth')).toHaveValue('05/04/1990');
    fireEvent.change(name, { target: { value: 'Asha R Rao' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({ displayName: 'Asha R Rao', birthDate: '1990-04-05' }),
    );
    await waitFor(() => expect(screen.queryByText('Edit profile')).toBeNull());
  });

  it('needs a name and shows a failed save', async () => {
    render(<EditProfile user={user} today="2026-11-03" />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Your name, as your bank prints it'), { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Enter your name.')).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Your name, as your bank prints it'), { target: { value: 'Asha' } });
    updateProfile.mockResolvedValue({ success: false, error: { message: 'Name is too long' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Name is too long')).toBeInTheDocument();
  });
});

describe('ProfileCard birth date', () => {
  it('shows dd/mm/yyyy, and hides it while amounts are hidden', () => {
    const { unmount } = render(<ProfileCard user={user} />);
    expect(screen.getByText('05/04/1990')).toBeInTheDocument();
    unmount();
    render(
      <ConcealProvider concealed>
        <ProfileCard user={user} />
      </ConcealProvider>,
    );
    expect(screen.queryByText('05/04/1990')).toBeNull();
    expect(screen.getByText('••/••/••••')).toBeInTheDocument();
  });
});
