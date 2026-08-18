import { after } from 'next/server';

export interface LogEnvelope {
  service: string;
  env: string;
  version: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  event: string;
  requestId?: string;
  sessionId?: string;
  userId?: string;
  route?: string;
  message?: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLogLevel(): number {
  const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return LOG_LEVELS[envLevel] ?? 1;
}

function shouldLog(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'): boolean {
  const levelNum = LOG_LEVELS[level.toLowerCase()] ?? 1;
  return levelNum >= getMinLogLevel();
}

function getAppEnv(): string {
  if (process.env.APP_ENV) {
    return process.env.APP_ENV;
  }
  return process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
}

function getAppVersion(): string {
  if (process.env.NEXT_PUBLIC_APP_VERSION) {
    return process.env.NEXT_PUBLIC_APP_VERSION;
  }
  const sha =
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha) {
    return `1.0.0-${sha.slice(0, 12)}`;
  }
  return '1.0.0-local';
}

let isColdStartEmitted = false;

class RequestLogger {
  private buffer: LogEnvelope[] = [];
  private isFlushErrorLogged = false;

  constructor() {
    if (!isColdStartEmitted) {
      isColdStartEmitted = true;
      this.log('INFO', 'client.coldstart', { message: 'Vercel serverless function coldstart' });
    }
  }

  log(
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
    event: string,
    data: Record<string, unknown> = {}
  ): void {
    if (!shouldLog(level)) {
      return;
    }

    const envelope: LogEnvelope = {
      service: 'financeos-client',
      env: getAppEnv(),
      version: getAppVersion(),
      level,
      event,
      timestamp: new Date().toISOString(),
      ...data,
    };

    this.buffer.push(envelope);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    try {
      after(async () => {
        await this.flush();
      });
    } catch {
      // Fallback: If outside an after() request context (e.g. background init), flush asynchronously
      Promise.resolve().then(() => this.flush());
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const itemsToFlush = [...this.buffer];
    this.buffer = [];

    const lokiUrl = process.env.GRAFANA_LOKI_URL;
    const lokiUser = process.env.GRAFANA_LOKI_USER;
    const lokiToken = process.env.GRAFANA_CLOUD_TOKEN;

    if (!lokiUrl || !lokiUser || !lokiToken) {
      if (!this.isFlushErrorLogged) {
        this.isFlushErrorLogged = true;
        console.error('[Logger] Missing Loki configuration (GRAFANA_LOKI_URL, GRAFANA_LOKI_USER, or GRAFANA_CLOUD_TOKEN).');
      }
      return;
    }

    const host = process.env.VERCEL_REGION || process.env.VERCEL_DEPLOYMENT_ID || 'vercel';

    try {
      // Format Loki push payload
      const streams = itemsToFlush.map((item) => ({
        stream: {
          service: item.service,
          env: item.env,
          level: item.level.toUpperCase(),
          host,
        },
        values: [
          [
            String(Date.now() * 1000000), // nanoseconds timestamp
            JSON.stringify(item),
          ],
        ],
      }));

      const authHeader = `Basic ${Buffer.from(`${lokiUser}:${lokiToken}`).toString('base64')}`;

      const response = await fetch(lokiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ streams }),
      });

      if (!response.ok) {
        if (!this.isFlushErrorLogged) {
          this.isFlushErrorLogged = true;
          console.error(`[Logger] Failed to push logs to Loki (HTTP status ${response.status}).`);
        }
      }
    } catch (err) {
      if (!this.isFlushErrorLogged) {
        this.isFlushErrorLogged = true;
        const errName = err instanceof Error ? err.name : 'UnknownError';
        console.error(`[Logger] Network failure pushing logs to Loki (${errName}).`);
      }
    }
  }
}

export const logger = new RequestLogger();
