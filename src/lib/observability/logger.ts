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

let isColdStartEmitted = false;

class RequestLogger {
  private buffer: LogEnvelope[] = [];

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
      env: process.env.NODE_ENV || 'development',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
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
      return;
    }

    try {
      // Format Loki push payload
      const streams = itemsToFlush.map((item) => ({
        stream: {
          service: item.service,
          env: item.env,
          level: item.level.toLowerCase(),
        },
        values: [
          [
            String(Date.now() * 1000000), // nanoseconds timestamp
            JSON.stringify(item),
          ],
        ],
      }));

      const authHeader = `Basic ${Buffer.from(`${lokiUser}:${lokiToken}`).toString('base64')}`;

      await fetch(lokiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ streams }),
      });
    } catch {
      // Fail silently: logger must never throw or disrupt page rendering/actions
    }
  }
}

export const logger = new RequestLogger();
