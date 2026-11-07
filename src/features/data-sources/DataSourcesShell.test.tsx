import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DataSourcesShell } from './DataSourcesShell';

let pathname = '/data-sources';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));
vi.mock('@/features/shell/ShellPage', () => ({
  ShellPage: ({
    title,
    crumb,
    backHref,
    children,
  }: {
    title: string;
    crumb?: React.ReactNode;
    backHref?: string;
    children: React.ReactNode;
  }) => (
    <div data-back={backHref ?? ''}>
      <h1>{title}</h1>
      <span data-testid="crumb">{crumb ?? ''}</span>
      {children}
    </div>
  ),
}));

beforeEach(() => {
  pathname = '/data-sources';
});

const renderShell = () =>
  render(
    <DataSourcesShell>
      <p>body</p>
    </DataSourcesShell>,
  );

describe('DataSourcesShell', () => {
  it('on the main page is titled Data sources with no back arrow', () => {
    renderShell();
    expect(screen.getByRole('heading', { name: 'Data sources' })).toBeInTheDocument();
    expect(screen.getByTestId('crumb')).toHaveTextContent('Settings');
    expect(document.querySelector('[data-back]')).toHaveAttribute('data-back', '');
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it.each([
    ['/data-sources/connections', 'Connections'],
    ['/data-sources/imports', 'Imports'],
    ['/data-sources/sync', 'Sync health'],
  ])('on %s the top bar is titled %s, the back button leads to /data-sources', (path, title) => {
    pathname = path;
    renderShell();
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(document.querySelector('[data-back]')).toHaveAttribute('data-back', '/data-sources');
  });
});
