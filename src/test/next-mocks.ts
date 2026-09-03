import { vi } from 'vitest';

export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};

export const mockRevalidatePath = vi.fn();
export const mockRedirect = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: mockRedirect,
  unstable_rethrow: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
  revalidateTag: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: 'mock-session-cookie' }),
    getAll: vi.fn().mockReturnValue([]),
    has: vi.fn().mockReturnValue(true),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));
