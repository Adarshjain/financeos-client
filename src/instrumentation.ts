/**
 * Next.js instrumentation hook: ships server traces to Grafana Cloud (OTLP) when configured.
 * With no GRAFANA_OTLP_* settings (local dev, CI, E2E) it does nothing.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const endpoint = process.env.GRAFANA_OTLP_ENDPOINT;
  const user = process.env.GRAFANA_OTLP_USER;
  const token = process.env.GRAFANA_CLOUD_TOKEN;
  if (!endpoint || !user || !token) return;

  try {
    const { OTLPHttpJsonTraceExporter, registerOTel } = await import('@vercel/otel');

    const sha = process.env.VERCEL_GIT_COMMIT_SHA;
    const apiBase = process.env.API_BASE_URL || 'http://localhost:6969';

    registerOTel({
      serviceName: 'financeos-client',
      attributes: {
        'deployment.environment.name': process.env.APP_ENV || (process.env.NODE_ENV === 'production' ? 'prod' : 'dev'),
        'service.version': sha ? sha.slice(0, 12) : 'local',
      },
      traceExporter: new OTLPHttpJsonTraceExporter({
        url: endpoint,
        headers: { Authorization: `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}` },
      }),
      // Server-side fetches to the API carry `traceparent`, so API spans join the Next trace.
      instrumentationConfig: { fetch: { propagateContextUrls: [apiBase] } },
    });
  } catch (error) {
    // Telemetry must never break the app.
    console.error('[otel] registration failed', error instanceof Error ? error.name : 'UnknownError');
  }
}
