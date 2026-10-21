import { vi } from 'vitest';

import type { AppNotification, NotificationFeedPage } from '@/lib/api/types';

export function notif(over: Partial<AppNotification> & { id: string }): AppNotification {
  return {
    kind: 'job_finished',
    title: `Title ${over.id}`,
    body: `Body ${over.id}`,
    createdAt: '2026-10-21T08:35:00.123456Z',
    read: true,
    refs: { jobId: 'j1' },
    ...over,
  } as AppNotification;
}

export function feedPage(content: AppNotification[], over: Partial<NotificationFeedPage> = {}): NotificationFeedPage {
  return { content, totalElements: content.length, totalPages: content.length ? 1 : 0, ...over } as NotificationFeedPage;
}

/** Answers GET feed and summary from the given data; everything else resolves empty. */
export function serve(api: { GET: ReturnType<typeof vi.fn> }, page: NotificationFeedPage, unread: number) {
  api.GET.mockImplementation(async (path: string) => ({
    data: path.endsWith('/summary') ? { unread } : page,
  }));
}
