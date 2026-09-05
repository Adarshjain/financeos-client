import type { ApiClient } from './api';
import { E2E_API_URL } from './config';
import { scriptLlm, type ScriptResponseEntry } from './control';

export interface ChatStreamEvent {
  event: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export interface StreamChatResult {
  status: number;
  header: string | null;
  events: ChatStreamEvent[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function parseSseStream(text: string): ChatStreamEvent[] {
  const events: ChatStreamEvent[] = [];
  const blocks = text.split(/\r?\n\r?\n/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    let eventType = 'message';
    let dataText = '';

    const lines = block.split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith(':')) {
        // Comment / heartbeat, ignore
        continue;
      }
      if (line.startsWith('event:')) {
        eventType = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        const chunk = line.substring(5).trim();
        dataText = dataText ? `${dataText}\n${chunk}` : chunk;
      }
    }

    if (dataText || eventType !== 'message') {
      let parsedData: unknown = dataText;
      try {
        parsedData = JSON.parse(dataText);
      } catch {
        parsedData = dataText;
      }
      events.push({
        event: eventType,
        data: parsedData,
      });
    }
  }

  return events;
}

export async function streamChat(
  cookie: string | null | undefined,
  messages: ChatMessage[],
  maxRetries = 4
): Promise<StreamChatResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookie) {
    headers['Cookie'] = `FINANCEOS_SESSION=${cookie}`;
  }

  let attempt = 0;
  let delay = 300;
  while (true) {
    const res = await fetch(`${E2E_API_URL}/api/v1/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages }),
    });

    const status = res.status;
    const header = res.headers.get('x-chat-error');
    if (status === 429 && header === 'CHAT_BUSY' && attempt < maxRetries) {
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
      continue;
    }

    const text = await res.text();
    const events = parseSseStream(text);

    return {
      status,
      header,
      events,
    };
  }
}

export async function syncChat(
  api: ApiClient,
  messages: ChatMessage[],
  maxRetries = 4
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  let attempt = 0;
  let delay = 300;
  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (api as any).POST('/api/v1/chat', {
      body: { messages },
    });
    const header = res.response?.headers?.get?.('x-chat-error');
    if (res.response?.status === 429 && header === 'CHAT_BUSY' && attempt < maxRetries) {
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
      continue;
    }
    return res;
  }
}

export async function scriptChat(
  api: ApiClient,
  steps: (unknown | ScriptResponseEntry)[]
): Promise<{ queued: Record<string, number> }> {
  const formatted: ScriptResponseEntry[] = steps.map((step) => {
    if (step && typeof step === 'object') {
      const s = step as Record<string, unknown>;
      if ('json' in s || 'error' in s) {
        return step as ScriptResponseEntry;
      }
      if ('delayMs' in s) {
        const { delayMs, ...rest } = s;
        return { delayMs: delayMs as number, json: rest };
      }
    }
    return { json: step };
  });
  return scriptLlm(api, 'data-chat', formatted);
}

export async function withBusyRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  delayMs = 500
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const res = await fn();
      if (
        res &&
        typeof res === 'object' &&
        'status' in res &&
        (res as { status: number }).status === 429 &&
        'header' in res &&
        (res as { header: string | null }).header === 'CHAT_BUSY'
      ) {
        attempt++;
        if (attempt >= maxRetries) return res;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      return res;
    } catch (err: unknown) {
      const errStr = String(err);
      if (errStr.includes('CHAT_BUSY') || errStr.includes('429')) {
        attempt++;
        if (attempt >= maxRetries) throw err;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
  return fn();
}

export function clarifyTranscript(
  existingMessages: ChatMessage[],
  question: string,
  reply: string
): ChatMessage[] {
  return [
    ...existingMessages,
    {
      role: 'assistant',
      content: `[You asked the user to clarify]: ${question}`,
    },
    {
      role: 'user',
      content: reply,
    },
  ];
}
