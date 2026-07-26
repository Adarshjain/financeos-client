import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getStatementDetail, listStatementsByAccount } from '@/actions/statements';
import { statementsApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  statementsApi: {
    listByAccount: vi.fn(),
    getById: vi.fn(),
  },
}));

describe('statements server actions (WP-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles statements listing and details API calls', async () => {
    vi.mocked(statementsApi.listByAccount).mockResolvedValue([{ id: 's1' }] as any);
    vi.mocked(statementsApi.getById).mockResolvedValue({ id: 's1', lines: [] } as any);

    expect((await listStatementsByAccount('acc1')).success).toBe(true);
    expect((await getStatementDetail('s1')).success).toBe(true);
  });
});
