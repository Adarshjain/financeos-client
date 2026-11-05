import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { keys } from '@/lib/query/keys';

import { scheduleNpsImportRefetch } from './npsImportRefetch';

describe('scheduleNpsImportRefetch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined);
    return { qc, spy };
  };
  const npsCalls = (spy: ReturnType<typeof setup>['spy']) => spy.mock.calls.filter((c) => JSON.stringify(c[0]?.queryKey) === JSON.stringify(keys.nps.all)).length;

  it('invalidates the NPS keys at 3 s and 10 s, not before', () => {
    const { qc, spy } = setup();
    scheduleNpsImportRefetch(qc);
    vi.advanceTimersByTime(2999);
    expect(npsCalls(spy)).toBe(0);
    vi.advanceTimersByTime(1);
    expect(npsCalls(spy)).toBe(1);
    vi.advanceTimersByTime(7000);
    expect(npsCalls(spy)).toBe(2);
  });

  it('a new call cancels the earlier pair', () => {
    const { qc, spy } = setup();
    scheduleNpsImportRefetch(qc);
    vi.advanceTimersByTime(2000);
    scheduleNpsImportRefetch(qc);
    vi.advanceTimersByTime(20000);
    expect(npsCalls(spy)).toBe(2);
  });
});
