import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const inboxApi = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ inboxApi }));
let qc: QueryClient;
vi.mock('@/lib/query/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/query/client')>('@/lib/query/client');
  return { ...actual, getQueryClient: () => qc };
});
vi.mock('@/components/inbox/InboxView', () => ({ InboxView: () => null }));

import { keys } from '@/lib/query/keys';

import InboxPage from '../page';

type El = { props: { state: { queries: Array<{ queryKey: unknown; state: { data: unknown } }> }; children: { props: { highlightKey: string | null } } } };
const render = async (sp?: Record<string, string | string[] | undefined>) =>
  (await InboxPage({ searchParams: sp ? Promise.resolve(sp) : undefined })) as unknown as El;
const hl = (e: El) => e.props.children.props.highlightKey;
const find = (e: El, key: unknown) => e.props.state.queries.find((q) => JSON.stringify(q.queryKey) === JSON.stringify(key));

describe('InboxPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('?item as a string becomes the highlight key', async () => {
    inboxApi.list.mockResolvedValue({ items: [], summary: {} });
    expect(hl(await render({ item: 'k1' }))).toBe('k1');
  });

  it('a repeated ?item uses the first value', async () => {
    inboxApi.list.mockResolvedValue({ items: [], summary: {} });
    expect(hl(await render({ item: ['first', 'second'] }))).toBe('first');
  });

  it('an empty ?item is null', async () => {
    inboxApi.list.mockResolvedValue({ items: [], summary: {} });
    expect(hl(await render({ item: '' }))).toBeNull();
    expect(hl(await render({ item: [] }))).toBeNull();
  });

  it('an absent ?item or absent searchParams is null', async () => {
    inboxApi.list.mockResolvedValue({ items: [], summary: {} });
    expect(hl(await render({}))).toBeNull();
    expect(hl(await render())).toBeNull();
  });

  it('prefetches the list and seeds the summary from list.summary', async () => {
    const inbox = { items: [{ key: 'a' }], summary: { total: 1 } };
    inboxApi.list.mockResolvedValue(inbox);
    const el = await render();
    expect(find(el, keys.inbox.list())?.state.data).toEqual(inbox);
    expect(find(el, keys.inbox.summary())?.state.data).toEqual({ total: 1 });
  });

  it('a failed prefetch still renders the view with nothing seeded', async () => {
    inboxApi.list.mockRejectedValue(new Error('down'));
    const el = await render({ item: 'k' });
    expect(hl(el)).toBe('k');
    expect(el.props.state.queries).toHaveLength(0);
  });
});
