import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsShell } from './SettingsShell';

let pathname = '/ds/settings';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/features/shell/ShellPage', () => ({
  ShellPage: ({ title, crumb, flushTop, children }: { title: string; crumb?: string; flushTop?: boolean; children: React.ReactNode }) => (
    <div data-flush={String(!!flushTop)}>
      <h1>{title}</h1>
      <span data-testid="crumb">{crumb ?? ''}</span>
      {children}
    </div>
  ),
}));

beforeEach(() => {
  pathname = '/ds/settings';
});

describe('SettingsShell', () => {
  it('renders the six tabs as links in order with the active one marked', () => {
    pathname = '/ds/settings/ai';
    render(<SettingsShell>body</SettingsShell>);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Profile & appearance',
      'Connections',
      'AI',
      'Notifications',
      'Activity',
      'Debug',
    ]);
    expect(tabs.map((t) => t.getAttribute('href'))).toEqual([
      '/ds/settings',
      '/ds/settings/connections',
      '/ds/settings/ai',
      '/ds/settings/notifications',
      '/ds/settings/activity',
      '/ds/settings/debug',
    ]);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true', 'false', 'false', 'false']);
  });

  it('titles Profile "Settings" with no crumb, and starts flush with the tabs', () => {
    const { container } = render(<SettingsShell>body</SettingsShell>);
    expect(screen.getByRole('heading')).toHaveTextContent('Settings');
    expect(screen.getByTestId('crumb')).toBeEmptyDOMElement();
    expect(container.firstElementChild).toHaveAttribute('data-flush', 'true');
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it.each([
    ['/ds/settings/connections', 'Connections'],
    ['/ds/settings/ai', 'AI'],
    ['/ds/settings/notifications', 'Notifications'],
    ['/ds/settings/activity', 'Activity'],
    ['/ds/settings/debug', 'Debug'],
  ])('titles %s "%s" with the Settings crumb', (path, title) => {
    pathname = path;
    render(<SettingsShell>body</SettingsShell>);
    expect(screen.getByRole('heading')).toHaveTextContent(title);
    expect(screen.getByTestId('crumb')).toHaveTextContent('Settings');
  });
});
