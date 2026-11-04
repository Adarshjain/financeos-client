import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsShell } from './SettingsShell';

let pathname = '/settings';
let theme: string | undefined = 'system';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('next-themes', () => ({ useTheme: () => ({ theme, setTheme: vi.fn() }) }));
vi.mock('@/features/shell/ShellPage', () => ({
  ShellPage: ({
    title,
    crumb,
    phoneBackHref,
    children,
  }: {
    title: string;
    crumb?: string;
    phoneBackHref?: string;
    children: React.ReactNode;
  }) => (
    <div data-phone-back={phoneBackHref ?? ''}>
      <h1>{title}</h1>
      <span data-testid="crumb">{crumb ?? ''}</span>
      {children}
    </div>
  ),
}));

const user = { displayName: 'Arjun Mehta', email: 'arjun@example.test' };

function renderShell(values = {}) {
  return render(
    <SettingsShell user={user} values={values}>
      <p>body</p>
    </SettingsShell>,
  );
}

beforeEach(() => {
  pathname = '/settings';
  theme = 'system';
});

describe('SettingsShell list', () => {
  it('lists the sections as links, grouped, with the profile row first', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'Settings sections' });
    expect(within(nav).getAllByRole('link').map((l) => l.getAttribute('href'))).toEqual([
      '/settings/profile',
      '/settings/appearance',
      '/settings/app-lock',
      '/settings/notifications',
      '/settings/connections',
      '/settings/ai',
      '/settings/activity',
      '/settings/debug',
    ]);
    ['General', 'Data', 'Help'].forEach((g) => expect(within(nav).getByText(g)).toBeInTheDocument());
    expect(within(nav).getByText('Arjun Mehta')).toBeInTheDocument();
    expect(within(nav).getByText('arjun@example.test')).toBeInTheDocument();
  });

  it('titles the profile row with the email when there is no name, without repeating it', () => {
    render(
      <SettingsShell user={{ displayName: null, email: 'a@b.c' }} values={{}}>
        x
      </SettingsShell>,
    );
    expect(screen.getAllByText('a@b.c')).toHaveLength(1);
  });

  it('shows the row values', () => {
    theme = 'dark';
    renderShell({ appLockArmed: true, attentionCount: 2, aiKeyCount: 3 });
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.getByText('2 needs attention')).toBeInTheDocument();
    expect(screen.getByText('3 keys')).toBeInTheDocument();
  });

  it('shows Off, None and 1 key, and no attention badge at 0', () => {
    const { rerender } = renderShell({ appLockArmed: false, attentionCount: 0, aiKeyCount: 0 });
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.queryByText(/needs attention/)).toBeNull();
    rerender(
      <SettingsShell user={user} values={{ aiKeyCount: 1 }}>
        x
      </SettingsShell>,
    );
    expect(screen.getByText('1 key')).toBeInTheDocument();
  });

  it('leaves a value off when its request failed', () => {
    renderShell({});
    expect(screen.queryByText('On')).toBeNull();
    expect(screen.queryByText('Off')).toBeNull();
    expect(screen.queryByText('None')).toBeNull();
  });

  it('highlights the open section row only', () => {
    pathname = '/settings/ai';
    renderShell();
    const rows = screen.getAllByRole('link');
    const ai = rows.find((r) => r.getAttribute('href') === '/settings/ai')!;
    const profile = rows.find((r) => r.getAttribute('href') === '/settings/profile')!;
    expect(ai.className).not.toBe(profile.className);
  });

  it.each(['/settings', '/settings/profile'])('highlights the Profile row on %s', (p) => {
    pathname = p;
    renderShell();
    const rows = screen.getAllByRole('link');
    const profile = rows.find((r) => r.getAttribute('href') === '/settings/profile')!;
    const ai = rows.find((r) => r.getAttribute('href') === '/settings/ai')!;
    expect(profile.className).not.toBe(ai.className);
  });
});

describe('SettingsShell layout', () => {
  it('on /settings: titled Settings, no back, list visible on phone, content hidden on phone', () => {
    renderShell();
    expect(screen.getByRole('heading')).toHaveTextContent('Settings');
    expect(screen.getByTestId('crumb')).toHaveTextContent('Settings');
    expect(document.querySelector('[data-phone-back]')).toHaveAttribute('data-phone-back', '');
    const nav = screen.getByRole('navigation', { name: 'Settings sections' });
    expect(nav.className).not.toContain('hidden');
    expect(screen.getByText('body').parentElement!.className).toContain('hidden desk:block');
  });

  it('on a section: titled with it, back to /settings, list hidden on phone only, content shown', () => {
    pathname = '/settings/appearance';
    renderShell();
    expect(screen.getByRole('heading')).toHaveTextContent('Appearance');
    expect(document.querySelector('[data-phone-back]')).toHaveAttribute('data-phone-back', '/settings');
    const nav = screen.getByRole('navigation', { name: 'Settings sections' });
    expect(nav.className).toContain('hidden desk:flex');
    expect(nav.className).toContain('desk:w-container-xs');
    expect(screen.getByText('body').parentElement!.className).not.toContain('hidden');
  });

  it.each([
    ['/settings/profile', 'Profile'],
    ['/settings/app-lock', 'App lock'],
    ['/settings/connections', 'Connections'],
    ['/settings/ai', 'AI'],
    ['/settings/notifications', 'Notifications'],
    ['/settings/activity', 'Activity'],
    ['/settings/debug', 'Debug'],
  ])('titles %s "%s"', (path, title) => {
    pathname = path;
    renderShell();
    expect(screen.getByRole('heading')).toHaveTextContent(title);
  });
});
