import '@/test/next-mocks';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { categorizeDescription, createCategory } from '@/actions/categories';
import { categoriesApi } from '@/lib/apiClient';

vi.mock('@/lib/apiClient', () => ({
  categoriesApi: {
    create: vi.fn(),
    categorizeDescription: vi.fn(),
  },
}));

describe('categories server actions (WP-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createCategory calls categoriesApi.create', async () => {
    vi.mocked(categoriesApi.create).mockResolvedValue({ id: 'c1', name: 'Shopping' } as any);
    const res = await createCategory('Shopping');
    expect(res.success).toBe(true);
  });

  it('categorizeDescription calls categoriesApi.categorizeDescription', async () => {
    vi.mocked(categoriesApi.categorizeDescription).mockResolvedValue({ category: 'Food' } as any);
    const res = await categorizeDescription('Swiggy Order');
    expect(res.success).toBe(true);
  });
});
