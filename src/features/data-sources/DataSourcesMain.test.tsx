import { screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { DataSourcesMain } from './DataSourcesMain';

const settled = <T,>(value: T): Promise<T> => Object.assign(Promise.resolve(value), { status: 'fulfilled', value });

describe('DataSourcesMain', () => {
  it('links the three sections in order', () => {
    renderWithQuery(<DataSourcesMain values={{ attentionCount: settled(0) }} />);
    expect(screen.getAllByRole('link').map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Connections', '/data-sources/connections'],
      ['Imports', '/data-sources/imports'],
      ['Sync health', '/data-sources/sync'],
    ]);
  });

  it('shows the attention count on Connections only', () => {
    renderWithQuery(<DataSourcesMain values={{ attentionCount: settled(3) }} />);
    const connections = screen.getByRole('link', { name: /Connections/ });
    expect(within(connections).getByText('3 needs attention')).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: /Imports/ })).queryByText(/needs attention/)).toBeNull();
  });

  it('hides a count whose request failed', () => {
    renderWithQuery(<DataSourcesMain values={{ attentionCount: settled(undefined) }} />);
    expect(screen.queryByText(/needs attention/)).toBeNull();
  });
});
