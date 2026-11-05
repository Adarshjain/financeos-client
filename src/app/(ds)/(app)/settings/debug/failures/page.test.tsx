import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ requireAuth: vi.fn(), redirectToSignIn: vi.fn() }));
vi.mock('@/lib/auth', () => auth);
const api = vi.hoisted(() => ({ summary: vi.fn(), listGmail: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ failuresApi: api }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/features/shell/loadHelpers', () => ({ guardSession: (p: Promise<unknown>) => p }));

import DsSettingsFailuresPage from './page';

beforeEach(() => {
  vi.resetAllMocks();
  api.summary.mockResolvedValue({ failedJobs: 1 });
  api.listGmail.mockResolvedValue({ content: [] });
});

describe('Failures page', () => {
  it('is not found for anyone but a failures admin, and calls no API', async () => {
    auth.requireAuth.mockResolvedValue({ admin: true, failuresAdmin: false });
    await expect(DsSettingsFailuresPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(api.summary).not.toHaveBeenCalled();
  });

  it('fetches the counts and the first email page once for an admin', async () => {
    auth.requireAuth.mockResolvedValue({ failuresAdmin: true });
    const element = await DsSettingsFailuresPage();
    expect(element.props.summary).toEqual({ failedJobs: 1 });
    expect(element.props.emails).toEqual({ content: [] });
    expect(api.summary).toHaveBeenCalledTimes(1);
    expect(api.listGmail).toHaveBeenCalledWith({ page: 0, size: 20 });
  });
});
