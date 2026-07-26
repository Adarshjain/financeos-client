import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/test/next-mocks';

import { createRule, deleteRule, updateRule, verifyRule } from '@/actions/rules';
import { rulesApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  rulesApi: {
    create: vi.fn(),
    update: vi.fn(),
    verify: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('rules server actions (WP-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles rules CRUD and verify API calls', async () => {
    vi.mocked(rulesApi.create).mockResolvedValue({ id: 'ru1' } as any);
    vi.mocked(rulesApi.update).mockResolvedValue({ id: 'ru1' } as any);
    vi.mocked(rulesApi.verify).mockResolvedValue({ id: 'ru1', verified: true } as any);
    vi.mocked(rulesApi.remove).mockResolvedValue(undefined);

    expect((await createRule({ descriptionPattern: 'x' } as any)).success).toBe(true);
    expect((await updateRule('ru1', { descriptionPattern: 'y' } as any)).success).toBe(true);
    expect((await verifyRule('ru1')).success).toBe(true);
    expect((await deleteRule('ru1')).success).toBe(true);
  });
});
