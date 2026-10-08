import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/toastError', () => ({ toastError }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { DashboardsList } from '../DashboardsList';

const layout = (y: number) => ({ x: 0, y, w: 4, h: 3 });
const home = {
  id: 'home', name: 'Home', description: 'My home', isDefault: false, updatedAt: '2026-10-01T00:00:00Z',
  widgets: [
    { id: 'w1', kind: 'builtin', builtinKey: 'net_worth', params: {}, layout: layout(0), builtin: { key: 'net_worth', label: 'Net worth', kind: 'template' } },
    { id: 'w2', kind: 'builtin', builtinKey: 'attention', params: {}, layout: layout(1), builtin: { key: 'attention', label: 'Attention', kind: 'component' } },
    { id: 'w3', kind: 'builtin', builtinKey: 'bills_due', params: {}, layout: layout(2), builtin: { key: 'bills_due', label: 'Bills', kind: 'component' } },
    { id: 'w4', kind: 'builtin', builtinKey: 'upcoming', params: { days: 14 }, title: '  Soon  ', layout: layout(3), builtin: { key: 'upcoming', label: 'Upcoming', kind: 'template' } },
    { id: 'w5', kind: 'report', reportId: 'rep-9', layout: layout(4), report: { name: 'R', type: 'TABLE', available: true } },
  ],
};

function setup(current: unknown = home) {
  vi.mocked(api.GET).mockImplementation((async (url: string) =>
    url === '/api/v1/dashboards' ? { data: [home] } : { data: current }) as never);
  vi.mocked(api.PUT).mockResolvedValue({ data: {} } as never);
  return renderWithQuery(<DashboardsList />);
}

describe('DashboardsList set as default', () => {
  beforeEach(() => vi.resetAllMocks());

  it('re-PUTs every widget through toDashboardWidget: built-ins keep kind/builtinKey/params, report keeps reportId', async () => {
    setup();
    fireEvent.click(await screen.findByTitle('Set as default'));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/dashboards/{id}', {
      params: { path: { id: 'home' } },
      body: {
        name: 'Home', description: 'My home', isDefault: true,
        widgets: [
          { id: 'w1', kind: 'builtin', reportId: null, builtinKey: 'net_worth', params: {}, title: null, layout: layout(0) },
          { id: 'w2', kind: 'builtin', reportId: null, builtinKey: 'attention', params: {}, title: null, layout: layout(1) },
          { id: 'w3', kind: 'builtin', reportId: null, builtinKey: 'bills_due', params: {}, title: null, layout: layout(2) },
          { id: 'w4', kind: 'builtin', reportId: null, builtinKey: 'upcoming', params: { days: 14 }, title: 'Soon', layout: layout(3) },
          { id: 'w5', kind: 'report', reportId: 'rep-9', builtinKey: null, params: null, title: null, layout: layout(4) },
        ],
      },
    });
  });

  it('refuses (no PUT) when the dashboard changed since the list rendered', async () => {
    setup({ ...home, updatedAt: '2026-10-02T00:00:00Z' });
    fireEvent.click(await screen.findByTitle('Set as default'));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(api.PUT).not.toHaveBeenCalled();
  });

  it('clearing the default sends isDefault false', async () => {
    const d = { ...home, isDefault: true };
    vi.mocked(api.GET).mockImplementation((async (url: string) => (url === '/api/v1/dashboards' ? { data: [d] } : { data: d })) as never);
    vi.mocked(api.PUT).mockResolvedValue({ data: {} } as never);
    renderWithQuery(<DashboardsList />);
    fireEvent.click(await screen.findByTitle('Clear default'));
    await waitFor(() => expect(api.PUT).toHaveBeenCalled());
    expect(vi.mocked(api.PUT).mock.calls[0][1]).toMatchObject({ body: { isDefault: false } });
  });
});
