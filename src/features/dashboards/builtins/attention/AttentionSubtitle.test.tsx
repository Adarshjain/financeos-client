import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { inbox, item } from '@/features/inbox/inboxTestUtils';
import { api } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

import { AttentionSubtitle } from './AttentionSubtitle';

describe('AttentionSubtitle', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reads "Most urgent first" until the inbox loads', () => {
    vi.mocked(api.GET).mockReturnValue(new Promise(() => {}) as never);
    renderWithQuery(<AttentionSubtitle />);
    expect(screen.getByText('Most urgent first')).toBeInTheDocument();
  });

  it('then the counts of what needs you', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: inbox([item({ key: 'a' }), item({ key: 'n', section: 'needs_look' })]) } as never);
    renderWithQuery(<AttentionSubtitle />);
    expect(await screen.findByTestId('inbox-widget-counts')).toHaveTextContent('Act now 1 · needs a look 1');
  });
});
