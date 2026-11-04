import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsShell } from './SettingsShell';

let pathname = '/settings';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/features/shell/ShellPage', () => ({
  ShellPage: ({
    title,
    crumb,
    phoneBackHref,
    children,
  }: {
    title: string;
    crumb?: React.ReactNode;
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

beforeEach(() => {
  pathname = '/settings';
});

const renderShell = () =>
  render(
    <SettingsShell>
      <p>body</p>
    </SettingsShell>,
  );

describe('SettingsShell', () => {
  it('on the main page is titled Settings with a plain crumb and no back arrow', () => {
    renderShell();
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByTestId('crumb')).toHaveTextContent('Settings');
    expect(screen.getByTestId('crumb').querySelector('a')).toBeNull();
    expect(document.querySelector('[data-phone-back]')).toHaveAttribute('data-phone-back', '');
  });

  it.each([
    ['/settings/notifications', 'Notifications'],
    ['/settings/connections', 'Connections'],
    ['/settings/ai', 'AI'],
    ['/settings/activity', 'Activity'],
    ['/settings/debug', 'Debug'],
  ])('on %s the top bar is titled %s, the crumb and phone arrow lead to /settings', (path, title) => {
    pathname = path;
    renderShell();
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByTestId('crumb').querySelector('a')).toHaveAttribute('href', '/settings');
    expect(document.querySelector('[data-phone-back]')).toHaveAttribute('data-phone-back', '/settings');
  });

  it('is one column with no section list on the main page or a section', () => {
    for (const path of ['/settings', '/settings/ai']) {
      pathname = path;
      const view = renderShell();
      expect(screen.queryByRole('navigation', { name: 'Settings sections' })).toBeNull();
      expect(screen.getByText('body').parentElement!.className).toContain('max-w-container-lg');
      view.unmount();
    }
  });
});
