import { dateTime12 } from '@/features/settings/failures/failuresModel';
import type { GmailMessageContent } from '@/lib/api/types';

/** The server's error codes for "View email". */
export const EMAIL_GONE_CODE = 'GMAIL_MESSAGE_GONE';
export const EMAIL_RECONNECT_CODE = 'GMAIL_RECONNECT_REQUIRED';

export type EmailFailure = 'gone' | 'reconnect' | 'generic';

export function classifyEmailFailure(code: string | undefined): EmailFailure {
  if (code === EMAIL_GONE_CODE) return 'gone';
  if (code === EMAIL_RECONNECT_CODE) return 'reconnect';
  return 'generic';
}

/** "from · dd/mm/yyyy, 3:30 pm · to", skipping what the mail does not carry. */
export function emailMeta(email: Pick<GmailMessageContent, 'from' | 'to' | 'date'>): string {
  return [email.from, dateTime12(email.date), email.to].filter((p) => p).join(' · ');
}

/**
 * The page the sandboxed iframe shows. The server already removed images, scripts and external loads;
 * the CSP is the second lock (nothing loads, no images, only inline styles). A fixed light page so a
 * mail written for white stays readable in dark mode; width 100% and wrapping keep it readable at 390.
 */
export function emailSrcDoc(html: string): string {
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src \'none\'">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<style>',
    ':root{color-scheme:light}',
    'html,body{margin:0;background:Canvas}',
    'body{box-sizing:border-box;width:100%;padding:12px;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:CanvasText;overflow-wrap:anywhere;word-break:break-word}',
    'table{max-width:100%}',
    'a{color:LinkText}',
    'pre{white-space:pre-wrap}',
    '</style></head><body>',
    html,
    '</body></html>',
  ].join('');
}

/**
 * A height for the frame that fits a short mail and scrolls a long one: the frame cannot report its content
 * height (no scripts), so it is estimated from the text length and the block tags, capped at 60% of the screen.
 */
export function emailFrameHeight(html: string): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const blocks = (html.match(/<(br|p|div|tr|li|h[1-6]|hr|blockquote)\b/gi) ?? []).length;
  const px = Math.round(48 + (Math.ceil(text.length / 45) + blocks) * 24);
  return `min(${Math.max(px, 120)}px, 60vh)`;
}
