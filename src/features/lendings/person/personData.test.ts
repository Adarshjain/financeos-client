import { beforeEach, describe, expect, it, vi } from 'vitest';

const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), cache: <T>(fn: T) => fn }));

const get = vi.hoisted(() => vi.fn());
const ledger = vi.hoisted(() => vi.fn());
vi.mock('@/lib/apiClient', () => ({ counterpartiesApi: { get, ledger } }));

import { ApiError } from '@/lib/api/client';

import { loadPersonPage } from './personData';
import { entriesFixture, ledgerFixture, personFixture } from './personModel.fixtures';

beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue(personFixture({ entryCount: 4 }));
  ledger.mockImplementation(async (_id: string, page: number, size: number) => ({
    ...ledgerFixture(entriesFixture().slice(0, size), 3),
    pageAsked: page,
  }));
});

describe('loadPersonPage', () => {
  it('asks the server only for the page in the URL', async () => {
    const data = await loadPersonPage('p1', { page: 1, size: 3 });
    expect(get).toHaveBeenCalledWith('p1');
    expect(ledger).toHaveBeenCalledTimes(1);
    expect(ledger).toHaveBeenCalledWith('p1', 1, 3);
    expect(data.cp.name).toBe('Rahul Sharma');
    expect(data.state).toEqual({ page: 1, size: 3 });
  });

  it('shows the last page when the URL is past the end', async () => {
    ledger.mockImplementation(async (_id: string, page: number) => ({
      ...ledgerFixture(entriesFixture().slice(0, 1), 2),
      pageAsked: page,
    }));
    const data = await loadPersonPage('p1', { page: 99, size: 3 });
    expect(ledger).toHaveBeenNthCalledWith(1, 'p1', 99, 3);
    expect(ledger).toHaveBeenNthCalledWith(2, 'p1', 1, 3);
    expect(data.state).toEqual({ page: 1, size: 3 });
    expect(data.ledger).toMatchObject({ pageAsked: 1 });
  });

  it('does not clamp for a person without entries', async () => {
    get.mockResolvedValue(personFixture({ entryCount: 0 }));
    ledger.mockResolvedValue(ledgerFixture([], 0));
    const data = await loadPersonPage('p1', { page: 5, size: 25 });
    expect(ledger).toHaveBeenCalledTimes(1);
    expect(data.state.page).toBe(5);
  });

  it('is a 404 for a person who does not exist', async () => {
    get.mockRejectedValue(new ApiError(404, { code: 'NOT_FOUND', message: 'no', timestamp: 'x' }));
    await expect(loadPersonPage('p1', { page: 0, size: 25 })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(ledger).not.toHaveBeenCalled();
  });

  it('is a 404 too when the server rejects the id itself (400)', async () => {
    get.mockRejectedValue(new ApiError(400, { code: 'BAD', message: 'no', timestamp: 'x' }));
    await expect(loadPersonPage('nope', { page: 0, size: 25 })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('lets any other failure through to the route error state', async () => {
    get.mockRejectedValue(new ApiError(500, { code: 'X', message: 'boom', timestamp: 'x' }));
    await expect(loadPersonPage('p1', { page: 0, size: 25 })).rejects.toThrow();
    expect(notFound).not.toHaveBeenCalled();
  });
});
