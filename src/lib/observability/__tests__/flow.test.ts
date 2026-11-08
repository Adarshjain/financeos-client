import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const span = { end: vi.fn() };
const startSpan = vi.fn(() => span);
let tracing = false;

vi.mock('@/instrumentation-client', () => ({
  getFaro: () => ({ api: { pushMeasurement: push, getOTEL: () => ({ trace: { getTracer: () => ({ startSpan }) } }) } }),
}));
vi.mock('@/lib/observability/lazyTracing', () => ({ isTracingLoaded: () => tracing }));

import { FLOW_TIMEOUT_MS, startFlow } from '../flow';

describe('startFlow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    push.mockClear();
    span.end.mockClear();
    startSpan.mockClear();
    tracing = false;
  });
  afterEach(() => vi.useRealTimers());

  it('pushes a flow measurement with duration and context', () => {
    const f = startFlow('gmail.sync');
    vi.advanceTimersByTime(1500);
    f.end('ok');
    expect(push).toHaveBeenCalledTimes(1);
    const [m, o] = push.mock.calls[0];
    expect(m.type).toBe('flow');
    expect(m.values.duration_ms).toBeGreaterThanOrEqual(1500);
    expect(o).toEqual({ context: { flow: 'gmail.sync', outcome: 'ok' } });
    expect(startSpan).not.toHaveBeenCalled();
  });
  it('creates a span when tracing is loaded', () => {
    tracing = true;
    startFlow('dashboard.load').end('empty');
    expect(startSpan).toHaveBeenCalledTimes(1);
    expect(span.end).toHaveBeenCalledTimes(1);
  });
  it('ignores a second end', () => {
    const f = startFlow('account.open');
    f.end('ok');
    f.end('error');
    expect(push).toHaveBeenCalledTimes(1);
  });
  it('drops a flow that does not end within 2 minutes', () => {
    const f = startFlow('statement.upload');
    vi.advanceTimersByTime(FLOW_TIMEOUT_MS + 1);
    f.end('ok');
    expect(push).not.toHaveBeenCalled();
  });
});
