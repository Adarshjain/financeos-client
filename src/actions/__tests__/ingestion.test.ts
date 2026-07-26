import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/test/next-mocks';

import { ingestStatementFiles } from '@/actions/ingestion';
import { ingestionApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  ingestionApi: {
    ingest: vi.fn(),
  },
}));

describe('ingestion server actions (WP-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ingestStatementFiles calls ingestionApi.ingest', async () => {
    vi.mocked(ingestionApi.ingest).mockResolvedValue({ count: 12 } as any);

    const form = new FormData();
    const res = await ingestStatementFiles('acc1', form);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.count).toBe(12);
    }
  });
});
