import type { Faro } from '@grafana/faro-web-sdk';
import { initializeFaro } from '@grafana/faro-web-sdk';

let faroInstance: Faro | null = null;

/**
 * Initializes Grafana Faro Web SDK eagerly at client startup.
 * Eager initialization ensures that early React 19 / RSC hydration-time errors
 * and unhandled rejections are caught and sent to Grafana Faro.
 */
export function initFaro(): Faro | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (faroInstance) {
    return faroInstance;
  }

  const faroUrl = process.env.NEXT_PUBLIC_FARO_URL;
  const faroAppKey = process.env.NEXT_PUBLIC_FARO_APP_KEY;

  if (!faroUrl || !faroAppKey) {
    return null;
  }

  const sha =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA;
  const appVersion =
    process.env.NEXT_PUBLIC_APP_VERSION ||
    (sha ? `1.0.0-${sha.slice(0, 12)}` : '1.0.0-local');
  const appEnv =
    process.env.APP_ENV ||
    (process.env.NODE_ENV === 'production' ? 'prod' : 'dev');

  try {
    faroInstance = initializeFaro({
      url: faroUrl,
      app: {
        name: 'financeos-client',
        version: appVersion,
        environment: appEnv,
      },
      apiKey: faroAppKey,
    });

    // Deliberate hack: Write Faro's session ID to a cookie (faro_session) so proxy.ts
    // and Vercel server actions can correlate server logs with the browser session.
    const updateSessionCookie = () => {
      const session = faroInstance?.api.getSession();
      if (session?.id) {
        document.cookie = `faro_session=${session.id}; Path=/; SameSite=Lax; Secure`;
      }
    };

    updateSessionCookie();
    window.addEventListener('focus', updateSessionCookie);
    faroInstance.metas.addListener(updateSessionCookie);
  } catch (err) {
    // Fail silently if Faro initialization fails
    console.warn('[Faro] Client instrumentation initialization failed:', err);
  }

  return faroInstance;
}

export function getFaro(): Faro | null {
  return faroInstance;
}
