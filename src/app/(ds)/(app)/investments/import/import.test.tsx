import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DsInvestmentsImportLoading from './loading';
import DsInvestmentsImportPage from './page';

vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn().mockResolvedValue(undefined) }));
const server = vi.hoisted(() => ({ fetchBrokers: vi.fn() }));
vi.mock('@/features/investments/investmentsServerApi', () => server);
vi.mock('@/features/shell/loadHelpers', () => ({ guardSession: (p: Promise<unknown>) => p }));
vi.mock('@/features/shell/ShellPage', () => ({
  ShellPage: ({ children, title, crumb, backHref }: { children: React.ReactNode; title: string; crumb: string; backHref: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{crumb}</p>
      <a href={backHref}>Back</a>
      {children}
    </div>
  ),
}));
vi.mock('@/features/investments/import/ImportTradebookScreen', () => ({
  ImportTradebookScreen: ({ brokers }: { brokers: { name: string }[] }) => <p>screen: {brokers.map((b) => b.name).join(',')}</p>,
}));

beforeEach(() => server.fetchBrokers.mockResolvedValue([{ id: 'b1', name: 'Zerodha main' }]));

describe('/investments/import', () => {
  it('reads the broker accounts on the server and hands them to the screen', async () => {
    render(await DsInvestmentsImportPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText('screen: Zerodha main')).toBeInTheDocument();
  });

  it('has a loading state framed like the page, with its back link', () => {
    render(<DsInvestmentsImportLoading />);
    expect(screen.getByRole('heading', { name: 'Import tradebook' })).toBeInTheDocument();
    expect(screen.getByText('Grow / Investments')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/investments/tradebook');
  });
});
