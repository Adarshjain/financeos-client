import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: ({ href, children, ...r }: any) => <a href={href} {...r}>{children}</a> }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { ReportsList } from '../ReportsList';

const reports = [
  { id: 'r1', name: 'Alpha', type: 'KPI', datasource: 'transactions', definition: {}, updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'r2', name: 'Beta', type: 'TABLE', datasource: 'transactions', definition: {}, updatedAt: '2026-01-01T00:00:00Z' },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.GET).mockImplementation((async (url: string) =>
    url === '/api/v1/reports' ? { data: reports } : { data: { ...reports[0], description: null } }) as never);
  vi.mocked(api.POST).mockResolvedValue({ data: { id: 'new' } } as never);
});

describe('ReportsList Duplicate', () => {
  it('has one Duplicate button per visible report', async () => {
    renderWithQuery(<ReportsList />);
    expect(await screen.findAllByRole('button', { name: 'Duplicate report' })).toHaveLength(2);
  });

  it('respects the type filter', async () => {
    renderWithQuery(<ReportsList activeType="TABLE" />);
    expect(await screen.findAllByRole('button', { name: 'Duplicate report' })).toHaveLength(1);
  });

  it('clicking duplicates that report and refreshes the list', async () => {
    const { queryClient } = renderWithQuery(<ReportsList />);
    const spy = vi.spyOn(queryClient, 'invalidateQueries');
    await userEvent.click((await screen.findAllByRole('button', { name: 'Duplicate report' }))[0]);
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
    expect(vi.mocked(api.POST).mock.calls[0][1]).toMatchObject({ body: { name: 'Alpha (copy)' } });
    await waitFor(() => expect(spy).toHaveBeenCalled());
  });
});
