import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ unstable_rethrow: () => undefined }));

import { serverApi as api } from '@/lib/api/server';

import { duplicateBuiltin, windowNote } from './duplicateBuiltinModel';

const resolved = (over: Record<string, unknown> = {}) => ({ label: 'Upcoming', type: 'TABLE', datasource: 'obligations', definition: { filters: [] }, windowAsOf: null, ...over });
const serve = (definition: unknown, report: unknown = { id: 'rep-1', name: 'Upcoming' }) =>
  vi.mocked(api.POST).mockImplementation(((url: string) => Promise.resolve({ data: url === '/api/v1/reports' ? report : definition })) as never);

beforeEach(() => vi.resetAllMocks());

describe('duplicateBuiltin', () => {
  it('resolves the template with the widget params, then saves it as a report named after the built-in', async () => {
    serve(resolved());
    const out = await duplicateBuiltin({ builtinKey: 'upcoming', params: { days: 30 } });
    expect(api.POST).toHaveBeenNthCalledWith(1, '/api/v1/dashboards/builtins/{key}/definition', { params: { path: { key: 'upcoming' } }, body: { params: { days: 30 } } });
    expect(api.POST).toHaveBeenNthCalledWith(2, '/api/v1/reports', { body: { name: 'Upcoming', type: 'TABLE', datasource: 'obligations', definition: { filters: [] } } });
    expect(out).toEqual({ report: { id: 'rep-1', name: 'Upcoming' }, windowAsOf: null });
  });

  it('hands on the reward window a copy is fixed to', async () => {
    serve(resolved({ windowAsOf: '2026-10-01' }));
    expect((await duplicateBuiltin({ builtinKey: 'cap_headroom', params: {} })).windowAsOf).toBe('2026-10-01');
  });

  it('throws the copy failure when the server gives no definition, or no report', async () => {
    serve(undefined);
    await expect(duplicateBuiltin({ builtinKey: 'attention', params: {} })).rejects.toThrow("Couldn't copy the widget as a report. Try again.");
    expect(api.POST).toHaveBeenCalledTimes(1);
    serve(resolved(), null);
    await expect(duplicateBuiltin({ builtinKey: 'upcoming', params: {} })).rejects.toThrow("Couldn't copy the widget as a report. Try again.");
  });

  it('writes the window note in dd/mm/yyyy, and none without a window', () => {
    expect(windowNote('2026-10-01')).toBe('This copy is fixed to the window open on 01/10/26.');
    expect(windowNote(null)).toBeNull();
  });
});
