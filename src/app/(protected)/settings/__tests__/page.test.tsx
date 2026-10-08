import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ email: 'me@example.com', displayName: 'Me', pictureUrl: null }),
}));
vi.mock('@/app/(protected)/settings/DeleteAccountCard', () => ({ DeleteAccountCard: () => <div>delete-card</div> }));
vi.mock('@/app/(protected)/settings/ThemeSettingsCard', () => ({ ThemeSettingsCard: () => <div>theme-card</div> }));

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
    ['Connections', '/settings/gmail'],
    ['AI keys & routing', '/settings/llm-keys'],
    ['Notifications', '/settings/notifications'],
    ['Activity', '/settings/activity'],
    ['Debug & diagnostics', '/debug'],
  ])('has the %s row linking to %s', async (label, href) => {
    await renderPage();
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
  });

  it('no longer links to the old jobs or ingest routes', async () => {
    await renderPage();
    const all = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(all).not.toContain('/settings/jobs');
    expect(all).not.toContain('/settings/ingest');
  });

  it('renders the theme and delete cards', async () => {
    await renderPage();
    expect(screen.getByText('theme-card')).toBeInTheDocument();
    expect(screen.getByText('delete-card')).toBeInTheDocument();
  });
});
