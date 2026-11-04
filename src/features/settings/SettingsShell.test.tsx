import { render, screen, waitFor, within } from '@testing-library/react';
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

type Vals = { appLockArmed?: boolean; attentionCount?: number; aiKeyCount?: number };
// A settled promise React's `use` reads without suspending (the status fields are what React sets itself on a streamed one).
const settled = <T,>(value: T): Promise<T> => Object.assign(Promise.resolve(value), { status: 'fulfilled', value });
const toValues = (v: Vals) => ({
  appLockArmed: settled(v.appLockArmed),
  attentionCount: settled(v.attentionCount),
  aiKeyCount: settled(v.aiKeyCount),
});

function renderShell(values: Vals = {}) {
  return render(
    <SettingsShell user={user} values={toValues(values)}>
      <p>body</p>
    </SettingsShell>,
  );
}

beforeEach(() => {
  pathname = '/settings';
  theme = 'system';
});

const navs = () => screen.getAllByRole('navigation', { name: 'Settings sections' });
const desktopNav = () => navs().find((n) => n.className.includes('hidden desk:flex'))!;
const phoneNav = () => navs().find((n) => n.className.includes('desk:hidden'));
const rowOf = (nav: HTMLElement, href: string) => within(nav).getAllByRole('link').find((r) => r.getAttribute('href') === href)!;

describe('SettingsShell list', () => {
  it('lists the sections as links, grouped, with the profile row first', () => {
    renderShell();
    const nav = desktopNav();
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
    pathname = '/settings/ai';
    render(
      <SettingsShell user={{ displayName: null, email: 'a@b.c' }} values={toValues({})}>
        x
      </SettingsShell>,
    );
    expect(screen.getAllByText('a@b.c')).toHaveLength(1);
  });

  it('renders at once and streams the row values in', async () => {
    theme = 'dark';
    pathname = '/settings/ai';
    renderShell({ appLockArmed: true, attentionCount: 2, aiKeyCount: 3 });
    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(await screen.findByText('On')).toBeInTheDocument();
    expect(await screen.findByText('2 needs attention')).toBeInTheDocument();
    expect(await screen.findByText('3 keys')).toBeInTheDocument();
  });

  it('renders every row while the values are still pending', () => {
    pathname = '/settings/ai';
    const pending = new Promise<never>(() => undefined);
    render(
      <SettingsShell user={user} values={{ appLockArmed: pending, attentionCount: pending, aiKeyCount: pending }}>
        x
      </SettingsShell>,
    );
    expect(within(desktopNav()).getAllByRole('link')).toHaveLength(8);
    expect(screen.queryByText('On')).toBeNull();
  });

  it('shows Off, None and 1 key, and no attention badge at 0', async () => {
    pathname = '/settings/ai';
    const first = renderShell({ appLockArmed: false, attentionCount: 0, aiKeyCount: 0 });
    expect(await screen.findByText('Off')).toBeInTheDocument();
    expect(await screen.findByText('None')).toBeInTheDocument();
    expect(screen.queryByText(/needs attention/)).toBeNull();
    first.unmount();
    renderShell({ aiKeyCount: 1 });
    expect(await screen.findByText('1 key')).toBeInTheDocument();
  });

  it('leaves a value off when its request failed (it settles to undefined)', async () => {
    pathname = '/settings/ai';
    renderShell({});
    await waitFor(() => expect(screen.getByText('Connections')).toBeInTheDocument());
    expect(screen.queryByText('On')).toBeNull();
    expect(screen.queryByText('Off')).toBeNull();
    expect(screen.queryByText('None')).toBeNull();
  });

  it('highlights the open section row only on the desktop list', () => {
    pathname = '/settings/ai';
    renderShell();
    expect(rowOf(desktopNav(), '/settings/ai').className).not.toBe(rowOf(desktopNav(), '/settings/profile').className);
  });

  it.each(['/settings', '/settings/profile'])('highlights the Profile row on %s in the desktop list', (p) => {
    pathname = p;
    renderShell();
    const nav = desktopNav();
    expect(rowOf(nav, '/settings/profile').className).not.toBe(rowOf(nav, '/settings/ai').className);
  });

  it('highlights nothing in the phone list at /settings', () => {
    renderShell();
    const phone = phoneNav()!;
    expect(rowOf(phone, '/settings/profile').className).toBe(rowOf(phone, '/settings/ai').className);
  });
});

describe('SettingsShell layout', () => {
  it('on /settings: titled Settings, no back, a phone list and a desktop list, content hidden on phone', () => {
    renderShell();
    expect(screen.getByRole('heading')).toHaveTextContent('Settings');
    expect(screen.getByTestId('crumb')).toHaveTextContent('Settings');
    expect(document.querySelector('[data-phone-back]')).toHaveAttribute('data-phone-back', '');
    expect(navs()).toHaveLength(2);
    expect(phoneNav()!.className).toContain('desk:hidden');
    expect(desktopNav().className).toContain('desk:w-container-xs');
    expect(screen.getByText('body').parentElement!.className).toContain('hidden desk:block');
  });

  it('on a section: titled with it, back to /settings, no phone list, desktop list, content shown', () => {
    pathname = '/settings/appearance';
    renderShell();
    expect(screen.getByRole('heading')).toHaveTextContent('Appearance');
    expect(document.querySelector('[data-phone-back]')).toHaveAttribute('data-phone-back', '/settings');
    expect(navs()).toHaveLength(1);
    expect(phoneNav()).toBeUndefined();
    expect(desktopNav().className).toContain('hidden desk:flex');
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
