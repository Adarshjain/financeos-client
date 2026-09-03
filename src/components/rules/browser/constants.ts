// Plain (non-'use client') module so both the server page (rules/page.tsx,
// for its prefetch) and the client hook (useRulesBrowser.ts) can share the
// exact same default page size without one importing across the client
// boundary.
export const RULES_PAGE_SIZE = 50;
