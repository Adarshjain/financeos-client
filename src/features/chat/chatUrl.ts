import { first, type SearchParamsRecord } from '@/features/shell/searchParams';

export interface ChatUrl {
  /** The question to send once when the screen opens (`?q=`), or undefined. */
  question?: string;
}

/** What a /chat address asks for: `?q=` is a question to send on arrival (blank counts as none). */
export function parseChatUrl(params: SearchParamsRecord): ChatUrl {
  return { question: first(params.q)?.trim() || undefined };
}
