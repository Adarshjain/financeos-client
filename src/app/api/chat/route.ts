import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const maxDuration = 300;

const API_BASE = process.env.API_BASE_URL || 'http://localhost:6969';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('FINANCEOS_SESSION')?.value;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (sessionCookie) {
      headers['Cookie'] = `FINANCEOS_SESSION=${sessionCookie}`;
    }

    const upstream = await fetch(`${API_BASE}/api/v1/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!upstream.ok) {
      const chatErrorHeader = upstream.headers.get('X-Chat-Error');
      if (upstream.status === 503 || chatErrorHeader === 'CHAT_DISABLED') {
        return NextResponse.json(
          { code: 'CHAT_DISABLED', message: 'Chat with data feature is currently disabled or unconfigured.' },
          { status: 503 },
        );
      }
      if (upstream.status === 429) {
        if (chatErrorHeader === 'CHAT_QUOTA_EXCEEDED') {
          return NextResponse.json(
            { code: 'CHAT_QUOTA_EXCEEDED', message: 'You have reached your daily chat message limit. Please try again tomorrow.' },
            { status: 429 },
          );
        }
        return NextResponse.json(
          { code: 'CHAT_BUSY', message: 'The chat system is currently busy processing other requests. Please try again in a moment.' },
          { status: 429 },
        );
      }

      let errorJson;
      try {
        errorJson = await upstream.json();
      } catch {
        errorJson = { code: 'UPSTREAM_ERROR', message: `Request failed with status ${upstream.status}` };
      }
      return NextResponse.json(errorJson, { status: upstream.status });
    }

    if (!upstream.body) {
      return NextResponse.json({ code: 'NO_BODY', message: 'Upstream response contained no body stream' }, { status: 500 });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Failed to connect to chat service' },
      { status: 500 },
    );
  }
}
