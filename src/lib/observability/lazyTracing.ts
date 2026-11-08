import type { Faro } from '@grafana/faro-web-sdk';

type TracingModule = { TracingInstrumentation: new () => Parameters<Faro['instrumentations']['add']>[0] };

let tracingLoaded = false;
let scheduled = false;

export function isTracingLoaded(): boolean {
  return tracingLoaded;
}

/**
 * Loads @grafana/faro-web-tracing after the page has loaded and the browser is idle, so the
 * OpenTelemetry bundle never lands in the first-load JS. Same-origin fetches (API rewrite,
 * server actions, RSC) get a traceparent header from the tracing fetch instrumentation.
 */
export function scheduleTracingLoad(
  faro: Faro,
  loader: () => Promise<TracingModule> = () => import('@grafana/faro-web-tracing') as unknown as Promise<TracingModule>,
): void {
  if (typeof window === 'undefined' || scheduled) return;
  scheduled = true;

  const load = () => {
    loader()
      .then(({ TracingInstrumentation }) => {
        faro.instrumentations.add(new TracingInstrumentation());
        tracingLoaded = true;
      })
      .catch(() => {
        // Tracing is best-effort.
      });
  };

  const whenIdle = () => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(load, { timeout: 5000 });
    } else {
      setTimeout(load, 2000);
    }
  };

  if (document.readyState === 'complete') {
    whenIdle();
  } else {
    window.addEventListener('load', whenIdle, { once: true });
  }
}

/** Test helper. */
export function resetLazyTracingForTests(): void {
  tracingLoaded = false;
  scheduled = false;
}
