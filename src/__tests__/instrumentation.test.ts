import { afterEach, describe, expect, it, vi } from 'vitest';

const registerOTel = vi.fn();
vi.mock('@vercel/otel', () => ({
  registerOTel,
  OTLPHttpJsonTraceExporter: class {},
}));

describe('instrumentation register()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    registerOTel.mockClear();
  });

  it('is a no-op without the Grafana OTLP env', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('GRAFANA_OTLP_ENDPOINT', '');
    vi.stubEnv('GRAFANA_OTLP_USER', '');
    vi.stubEnv('GRAFANA_CLOUD_TOKEN', '');
    const { register } = await import('@/instrumentation');
    await register();
    expect(registerOTel).not.toHaveBeenCalled();
  });

  it('is a no-op outside the node runtime even with env set', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    vi.stubEnv('GRAFANA_OTLP_ENDPOINT', 'https://otlp.example/v1/traces');
    vi.stubEnv('GRAFANA_OTLP_USER', '1');
    vi.stubEnv('GRAFANA_CLOUD_TOKEN', 't');
    const { register } = await import('@/instrumentation');
    await register();
    expect(registerOTel).not.toHaveBeenCalled();
  });

  it('registers once with the API origin propagated when fully configured', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('GRAFANA_OTLP_ENDPOINT', 'https://otlp.example/v1/traces');
    vi.stubEnv('GRAFANA_OTLP_USER', '1');
    vi.stubEnv('GRAFANA_CLOUD_TOKEN', 't');
    vi.stubEnv('API_BASE_URL', 'https://api.example');
    const { register } = await import('@/instrumentation');
    await register();
    expect(registerOTel).toHaveBeenCalledTimes(1);
    const cfg = registerOTel.mock.calls[0][0];
    expect(cfg.serviceName).toBe('financeos-client');
    expect(cfg.instrumentationConfig.fetch.propagateContextUrls).toContain('https://api.example');
  });
});
