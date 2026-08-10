/**
 * Statement-upload limits.
 *
 * These live here because `experimental.serverActions.bodySizeLimit` is the
 * binding constraint: it is enforced by the Next runtime *before* the server
 * action body runs, so an oversized request never reaches
 * `ingestionApi.ingest`, never produces a structured ApiError, and surfaces as
 * an opaque framework error instead.
 *
 * They are re-exported to the client through `env` below so the upload form
 * validates against the real configured value and renders it in its help text —
 * the two cannot drift. Previously the config capped a request at 2mb while the
 * UI promised "up to 10MB per file", which made failure the common case for real
 * bank and credit-card statement PDFs, with no useful message.
 *
 * Verified against Next 16.1.1's config schema that `serverActions` is still an
 * `experimental` key, so this setting is honoured rather than silently ignored.
 */
const MAX_FILE_MB = 10;
// Headroom over MAX_FILE_MB so several statements can be queued together, plus
// slack for multipart encoding overhead.
const MAX_REQUEST_MB = 30;

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Next 16 blocks cross-origin requests to dev-server internals (/_next/*) by
  // default, which breaks hydration and server actions when the app is opened
  // via a LAN IP. A bare '*' is rejected by Next's matcher; '*.*.*.*' matches
  // any IPv4 host, '**.local' covers mDNS hostnames. Dev-only, ignored in prod.
  allowedDevOrigins: ['*.*.*.*', '**.local'],
  experimental: {
    serverActions: {
      bodySizeLimit: `${MAX_REQUEST_MB}mb`,
    },
  },
  env: {
    NEXT_PUBLIC_MAX_FILE_MB: String(MAX_FILE_MB),
    NEXT_PUBLIC_MAX_REQUEST_MB: String(MAX_REQUEST_MB),
  },
};

export default nextConfig;
