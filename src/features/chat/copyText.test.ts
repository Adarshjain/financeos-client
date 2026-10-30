import { beforeEach, describe, expect, it, vi } from 'vitest';

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', () => ({ showToast: (...a: unknown[]) => toast(...a) }));

import { COPY_FAILED,copyText } from './copyText';

beforeEach(() => vi.clearAllMocks());

describe('copyText', () => {
  it('copies and says so', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    expect(await copyText('abc', 'Answer copied')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('abc');
    expect(toast).toHaveBeenCalledWith('Answer copied');
  });

  it('shows a danger toast when the write is refused', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true });
    expect(await copyText('abc', 'Answer copied')).toBe(false);
    expect(toast).toHaveBeenCalledWith(COPY_FAILED, { tone: 'danger' });
  });

  it('shows a danger toast when there is no clipboard', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    expect(await copyText('abc', 'Answer copied')).toBe(false);
    expect(toast).toHaveBeenCalledWith("Couldn't copy. Try again.", { tone: 'danger' });
  });
});
