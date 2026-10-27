import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ email: 'me@example.com', displayName: 'Me', pictureUrl: null }),
}));
vi.mock('@/app/(legacy)/legacy/(protected)/settings/DeleteAccountCard', () => ({ DeleteAccountCard: () => <div>delete-card</div> }));
vi.mock('@/app/(legacy)/legacy/(protected)/settings/ThemeSettingsCard', () => ({ ThemeSettingsCard: () => <div>theme-card</div> }));

import SettingsPage from '../page';

async function renderPage() {
  render(await SettingsPage());
}

describe('Settings page', () => {
  it('shows the profile email', async () => {
    await renderPage();
    expect(screen.getByText('me@example.com')).toBeInTheDocument();
  });

  it.each([
    ['Connections', '/legacy/settings/gmail'],
    ['AI keys & routing', '/legacy/settings/llm-keys'],
    ['Notifications', '/legacy/settings/notifications'],
    ['Activity', '/legacy/settings/activity'],
    ['Debug & diagnostics', '/legacy/debug'],
  ])('has the %s row linking to %s', async (label, href) => {
    await renderPage();
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
  });

  it('has an Open Dinero row that opens /dashboard with a full page load', async () => {
    await renderPage();
    expect(screen.getByRole('link', { name: 'Open Dinero' })).toHaveAttribute('href', '/dashboard');
  });

  it('no longer links to the old jobs or ingest routes', async () => {
    await renderPage();
    const all = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(all).not.toContain('/legacy/settings/jobs');
    expect(all).not.toContain('/legacy/settings/ingest');
  });

  it('renders the theme and delete cards', async () => {
    await renderPage();
    expect(screen.getByText('theme-card')).toBeInTheDocument();
    expect(screen.getByText('delete-card')).toBeInTheDocument();
  });
});
