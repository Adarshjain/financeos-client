import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserResponse } from '@/lib/types';

import { AppearanceCard } from './AppearanceCard';
import { DeleteAccountCard } from './DeleteAccountCard';
import { ProfileCard } from './ProfileCard';

const logout = vi.fn();
vi.mock('@/actions/auth', () => ({ logout: (...a: unknown[]) => logout(...a) }));

const deleteAccount = vi.fn();
vi.mock('./actions', () => ({ deleteAccount: (...a: unknown[]) => deleteAccount(...a) }));

const get = vi.fn();
vi.mock('@/lib/api/client', () => ({ api: { GET: (...a: unknown[]) => get(...a) } }));

const setTheme = vi.fn();
let theme: string | undefined = 'dark';
vi.mock('next-themes', () => ({ useTheme: () => ({ theme, setTheme }) }));

const google = { email: 'arjun@example.test', displayName: 'Arjun Mehta', pictureUrl: null, hasPassword: false } as UserResponse;
const withPassword = { ...google, hasPassword: true } as UserResponse;

function wrap(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  logout.mockReset();
  deleteAccount.mockReset();
  get.mockReset();
  setTheme.mockReset();
  theme = 'dark';
});

describe('ProfileCard', () => {
  it('shows name, email and the Google line for a Google-only user', () => {
    render(<ProfileCard user={google} />);
    expect(screen.getByText('Arjun Mehta')).toBeInTheDocument();
    expect(screen.getByText('arjun@example.test · signed in with Google')).toBeInTheDocument();
    expect(screen.getByText('AM')).toBeInTheDocument();
  });

  it('shows just the email for a password user', () => {
    render(<ProfileCard user={withPassword} />);
    expect(screen.getByText('arjun@example.test')).toBeInTheDocument();
    expect(screen.queryByText(/signed in with Google/)).toBeNull();
  });

  it('falls back to the email as name and initials when there is no display name', () => {
    render(<ProfileCard user={{ ...withPassword, displayName: null } as UserResponse} />);
    expect(screen.getAllByText('arjun@example.test')).toHaveLength(1);
    expect(screen.getByText('AR')).toBeInTheDocument();
  });

  it('shows only "Signed in with Google" under the email when a Google user has no display name', () => {
    render(<ProfileCard user={{ ...google, displayName: null } as UserResponse} />);
    expect(screen.getAllByText('arjun@example.test')).toHaveLength(1);
    expect(screen.getByText('Signed in with Google')).toBeInTheDocument();
  });

  it('runs the sign out action', async () => {
    render(<ProfileCard user={google} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
  });
});

describe('AppearanceCard', () => {
  it('marks the saved theme and switches themes', () => {
    render(<AppearanceCard />);
    const dark = screen.getByRole('radio', { name: 'Dark' });
    expect(dark).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(setTheme).toHaveBeenCalledWith('light');
    fireEvent.click(screen.getByRole('radio', { name: 'System' }));
    expect(setTheme).toHaveBeenCalledWith('system');
  });

  it('links Storybook as a plain page load', () => {
    render(<AppearanceCard />);
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/storybook');
  });
});

describe('DeleteAccountCard', () => {
  const summary = { counts: { accounts: 2, transactions: 1200 }, total: 1202 };

  const open = async (user = google) => {
    wrap(<DeleteAccountCard user={user} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    await screen.findByText('Delete account permanently');
  };
  const submit = () => screen.getByRole('button', { name: /Permanently delete account|Retry deletion/ });
  const type = (label: string | RegExp, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

  it('shows the card copy and opens no dialog until asked', () => {
    wrap(<DeleteAccountCard user={google} />);
    expect(screen.getByText(/Removes every account, transaction, statement, rule and connection/)).toBeInTheDocument();
    expect(screen.queryByText('Delete account permanently')).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it('shows the loading state then the counts', async () => {
    get.mockResolvedValue({ data: summary });
    await open();
    expect(screen.getByText('Calculating data to be deleted…')).toBeInTheDocument();
    expect(await screen.findByText('2 accounts · 1,200 transactions')).toBeInTheDocument();
    expect(screen.getByText(/Google OAuth permissions and Gmail connections will be revoked/)).toBeInTheDocument();
  });

  it('shows no counts when the summary fails and still lets deletion go on', async () => {
    get.mockResolvedValue({ data: undefined });
    await open();
    await waitFor(() => expect(screen.queryByText('Calculating data to be deleted…')).toBeNull());
    expect(screen.queryByText('Records to be deleted:')).toBeNull();
    expect(submit()).toBeDisabled();
  });

  it('asks a Google-only user for their email and gates on it plus DELETE', async () => {
    get.mockResolvedValue({ data: summary });
    await open();
    expect(screen.queryByLabelText('Current password')).toBeNull();
    expect(submit()).toBeDisabled();
    type('Confirm email address', 'ARJUN@example.test');
    expect(submit()).toBeDisabled();
    type(/Type "DELETE"/, 'delete');
    expect(submit()).toBeDisabled();
    type(/Type "DELETE"/, 'DELETE');
    expect(submit()).toBeEnabled();
    fireEvent.click(submit());
    await waitFor(() =>
      expect(deleteAccount).toHaveBeenCalledWith({ password: undefined, confirmEmail: 'ARJUN@example.test' }, true),
    );
  });

  it('asks a password user for their password', async () => {
    get.mockResolvedValue({ data: summary });
    await open(withPassword);
    expect(screen.queryByLabelText('Confirm email address')).toBeNull();
    type(/Type "DELETE"/, 'DELETE');
    expect(submit()).toBeDisabled();
    type('Current password', 'hunter22');
    fireEvent.click(submit());
    await waitFor(() =>
      expect(deleteAccount).toHaveBeenCalledWith({ password: 'hunter22', confirmEmail: undefined }, true),
    );
  });

  it('shows a busy failure as a warning and offers a retry', async () => {
    get.mockResolvedValue({ data: summary });
    deleteAccount.mockResolvedValue({ success: false, error: { code: 'ACCOUNT_DELETE_BUSY', message: 'A job is running' } });
    await open();
    type('Confirm email address', 'arjun@example.test');
    type(/Type "DELETE"/, 'DELETE');
    fireEvent.click(submit());
    expect(await screen.findByText('A job is running')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry deletion' })).toBeEnabled();
  });

  it('shows another failure and keeps the normal label', async () => {
    get.mockResolvedValue({ data: summary });
    deleteAccount.mockResolvedValue({ success: false, error: { code: 'X', message: 'Wrong password' } });
    await open(withPassword);
    type('Current password', 'nope');
    type(/Type "DELETE"/, 'DELETE');
    fireEvent.click(submit());
    expect(await screen.findByText('Wrong password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Permanently delete account' })).toBeEnabled();
  });

  it('cannot be closed while deleting', async () => {
    get.mockResolvedValue({ data: summary });
    let finish: (v: unknown) => void = () => {};
    deleteAccount.mockReturnValue(new Promise((r) => (finish = r)));
    await open(withPassword);
    type('Current password', 'pw');
    type(/Type "DELETE"/, 'DELETE');
    fireEvent.click(submit());
    expect(await screen.findByRole('button', { name: 'Deleting account…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.getByText('Delete account permanently')).toBeInTheDocument();
    finish({ success: false, error: { code: 'X', message: 'later' } });
    expect(await screen.findByText('later')).toBeInTheDocument();
  });

  it('resets the fields and error each time it opens', async () => {
    get.mockResolvedValue({ data: summary });
    deleteAccount.mockResolvedValue({ success: false, error: { code: 'X', message: 'Wrong password' } });
    await open(withPassword);
    type('Current password', 'pw');
    type(/Type "DELETE"/, 'DELETE');
    fireEvent.click(submit());
    await screen.findByText('Wrong password');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Delete account permanently')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    await screen.findByText('Delete account permanently');
    expect(screen.queryByText('Wrong password')).toBeNull();
    expect(screen.getByLabelText('Current password')).toHaveValue('');
    expect(screen.getByLabelText(/Type "DELETE"/)).toHaveValue('');
  });
});
