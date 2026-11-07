import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/shell/ShellPage', () => ({
  ShellPage: ({ title, crumb, backHref, children }: { title: string; crumb?: string; backHref?: string; children: React.ReactNode }) => (
    <div data-back={backHref} data-crumb={crumb}>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

import { ImportPickerScreen } from './ImportPickerScreen';

describe('ImportPickerScreen', () => {
  it('is titled Import a file, under Data sources, going back to Transactions', () => {
    const { container } = render(<ImportPickerScreen />);
    expect(screen.getByRole('heading', { name: 'Import a file' })).toBeInTheDocument();
    expect(container.querySelector('[data-crumb]')).toHaveAttribute('data-crumb', 'Settings / Data sources');
    expect(container.querySelector('[data-back]')).toHaveAttribute('data-back', '/transactions');
  });

  it('has a link row per kind with its subtitle', () => {
    render(<ImportPickerScreen />);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/transactions/import',
      '/investments/import',
      '/investments/import?type=epf',
      '/investments/import?type=nps',
    ]);
    expect(links[0]).toHaveTextContent('Bank or card statement');
    expect(links[0]).toHaveTextContent('PDF, XLSX or XLS from your bank');
    expect(links[3]).toHaveTextContent('NPS statement');
  });
});
