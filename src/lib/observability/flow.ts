import { getFaro } from '@/instrumentation-client';
import { isTracingLoaded } from '@/lib/observability/lazyTracing';

export type FlowName =
  | 'transactions.search'
  | 'dashboard.load'
  | 'account.open'
  | 'gmail.sync'
  | 'statement.upload';

export type FlowOutcome = 'ok' | 'error' | 'empty';

export const FLOW_TIMEOUT_MS = 2 * 60 * 1000;

/** `startedAt` is a performance.now() reading when the flow began before this call (e.g. the navigation start). */
export function startFlow(name: FlowName, startedAt: number = performance.now()): { end: (outcome: FlowOutcome) => void } {
  const startedAtEpoch = Date.now() - Math.round(performance.now() - startedAt);
  let done = false;

  // Server render has no Faro; no timer there.
  const timer =
    typeof window === 'undefined'
      ? undefined
      : setTimeout(() => {
          done = true;
        }, FLOW_TIMEOUT_MS);

  return {
    end(outcome) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      const faro = getFaro();
      if (!faro) return;
      const durationMs = Math.round(performance.now() - startedAt);
      try {
        faro.api.pushMeasurement(
          { type: 'flow', values: { duration_ms: durationMs } },
          { context: { flow: name, outcome } },
        );
        if (isTracingLoaded()) {
          const otel = faro.api.getOTEL();
          if (otel) {
            const span = otel.trace
              .getTracer('financeos-client')
              .startSpan(`flow.${name}`, { startTime: startedAtEpoch, attributes: { flow: name, outcome } });
            span.end(startedAtEpoch + durationMs);
          }
        }
      } catch {
        // Telemetry must never break the app.
      }
    },
  };
}
