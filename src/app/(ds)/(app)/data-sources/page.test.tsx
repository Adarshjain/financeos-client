import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ getAttentionItems: vi.fn() }));
vi.mock('@/lib/apiClient', () => ({ gmailApi: { getAttentionItems: api.getAttentionItems } }));
vi.mock('@/features/data-sources/DataSourcesMain', () => ({ DataSourcesMain: () => null }));

import DsDataSourcesPage from './page';

beforeEach(() => vi.resetAllMocks());

describe('Data sources main page', () => {
  it('streams the attention count', async () => {
    api.getAttentionItems.mockResolvedValue({ totalElements: 4 });
    const element = DsDataSourcesPage();
    await expect(element.props.values.attentionCount).resolves.toBe(4);
  });

  it('hides the count when its request failed instead of failing the page', async () => {
    api.getAttentionItems.mockRejectedValue(new Error('x'));
    const element = DsDataSourcesPage();
    await expect(element.props.values.attentionCount).resolves.toBeUndefined();
  });
});
