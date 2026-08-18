/**
 * Events constants for client-side and Vercel server-side telemetry.
 *
 * Source of truth for shared event names:
 * financeos-server/src/main/java/com/financeos/core/observability/Events.java
 */
export const Events = {
  // Shared domain events with server
  CATEGORIZE_DECISION: 'categorize.decision',
  REWARD_RECOMPUTE_COMPLETED: 'reward.recompute.completed',
  REWARD_REPORT_VIEWED: 'reward.report.viewed',
  IMPORT_PREVIEW_COMPUTED: 'import.preview.computed',
  IMPORT_COMMIT_COMPLETED: 'import.commit.completed',
  DEDUP_DECISION: 'dedup.decision',
  INSTRUMENT_RESOLVE: 'instrument.resolve',
  PARSE_FAILED: 'parse.failed',
  LOAN_MATCH_ATTEMPTED: 'loan.match.attempted',

  // Client-tier specific events (prefixed with client. or browser.)
  CLIENT_REQUEST: 'client.request',
  CLIENT_ACTION_FAILED: 'client.action.failed',
  CLIENT_API_CALL: 'client.api.call',
  CLIENT_AUTH_LOGIN: 'client.auth.login',
  CLIENT_AUTH_GOOGLE_CALLBACK: 'client.auth.google.callback',
  CLIENT_COLDSTART: 'client.coldstart',

  BROWSER_PAGE_VIEW: 'browser.page_view',
  BROWSER_UNHANDLED_ERROR: 'browser.unhandled_error',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];
