/**
 * The one place that knows where app pages live. Pages live at their plain paths (`/accounts`, `/home`, ...).
 * Old addresses that moved (bookmarks, push links, the server's Gmail redirect to `/settings/gmail`) are aliases of
 * the page that replaced them. Code that links to an app page writes the path and calls `appHref(path)`.
 *
 * Plain module (no 'use client') so server components and the proxy can call it.
 */
export const DS_PREFIX = '';

/** The Dinero home (the logo link). */
export const DS_HOME_HREF = '/home';

/** Old paths that moved: the old path to the plain path of the page that replaces it. */
const PATH_ALIASES: Record<string, string> = {
  '/settings/llm-keys': '/settings/ai',
  '/settings/gmail': '/data-sources/connections',
  '/settings/connections': '/data-sources/connections',
  '/settings/jobs': '/data-sources/sync',
  '/settings/activity': '/data-sources/sync',
  '/data-sources': '/settings',
  '/debug': '/settings/debug',
  '/rules/categories': '/transactions/tags',
  '/rules': '/transactions/tags',
  '/transactions/rules': '/transactions/tags',
  '/dashboard': '/home',
  '/notifications': '/inbox/updates',
  '/rewards/recommend': '/rewards/which-card',
  '/settings/ingest': '/transactions/import',
  '/loans/calendar': '/upcoming',
  '/investments/retirement': '/investments',
  '/investments/retirement/epf': '/investments/epf',
  '/investments/retirement/nps': '/investments/nps',
};

/** Old path prefixes that moved with their sub-pages: `/loans/lendings` and `/loans/lendings/{id}` live at `/lending`. */
const PREFIX_ALIASES: [from: string, to: string][] = [['/loans/lendings', '/lending']];

/** The old Needs-review page; Transactions has it as a filter (see `reviewQuery`). */
const REVIEW_PATH = '/transactions/review';

/** Paths that are not pages (API, OAuth callback, static files). */
const NON_PAGE_PATH = /^\/(api|auth|handbook|storybook|serwist|icons|brand|manifest\.webmanifest)(\/|$)/;

/** The Transactions `reason` values (lower case); old review links carry the enum names. */
const REVIEW_REASON_PARAMS = ['unreconciled', 'duplicate_suspect', 'date_corrected'];

/** Splits '/a/b?x=1#h' into the pathname and the rest ('?x=1#h'). */
function splitPath(path: string): [string, string] {
  const i = path.search(/[?#]/);
  return i === -1 ? [path, ''] : [path.slice(0, i), path.slice(i)];
}

/** True for a same-site app path ('/x'); false for external URLs, '//host', relative and empty values. */
function isAppPath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//');
}

function trimSlash(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/**
 * The old Needs-review query as a Transactions query: `review=needs_review` first, `account=a,b`
 * as repeated `account`, `reason` lower-cased (dropped when unknown), everything else kept. Hash is kept.
 */
function reviewQuery(rest: string): string {
  const hashAt = rest.indexOf('#');
  const hash = hashAt === -1 ? '' : rest.slice(hashAt);
  const query = (hashAt === -1 ? rest : rest.slice(0, hashAt)).replace(/^\?/, '');
  const out = new URLSearchParams({ review: 'needs_review' });
  new URLSearchParams(query).forEach((value, key) => {
    if (key === 'review') return;
    if (key === 'account') {
      value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
        .forEach((v) => out.append('account', v));
    } else if (key === 'reason') {
      const reason = value.trim().toLowerCase();
      if (REVIEW_REASON_PARAMS.includes(reason)) out.set('reason', reason);
    } else {
      out.append(key, value);
    }
  });
  return `?${out.toString()}${hash}`;
}

/** The page that replaces an old path (an alias), with its query: null when there is no alias. */
function aliasTarget(path: string, rest: string): { path: string; rest: string } | null {
  if (path === REVIEW_PATH) return { path: '/transactions', rest: reviewQuery(rest) };
  const to = PATH_ALIASES[path];
  if (to) return { path: to, rest };
  for (const [from, target] of PREFIX_ALIASES) {
    if (path === from || path.startsWith(`${from}/`)) return { path: target + path.slice(from.length), rest };
  }
  return null;
}

/**
 * Where to link for an app path: the page itself, or the page that replaced it when the path is an alias. Query
 * string and hash are kept. Non-app values (external URLs, relative, protocol-relative) and non-page paths
 * (`/api`, `/auth`, ...) pass through.
 */
export function appHref(path: string): string {
  if (!isAppPath(path)) return path;
  const [rawPath, rest] = splitPath(path);
  const pathname = trimSlash(rawPath);
  if (NON_PAGE_PATH.test(pathname)) return path;
  const alias = aliasTarget(pathname, rest);
  return `${alias?.path ?? pathname}${alias ? alias.rest : rest}`;
}

/**
 * Where a request for an old path must be redirected, or null to serve it: an alias goes to the page that
 * replaced it (query merged). `search` is '?a=b' or ''.
 */
export function rootRedirectFor(pathname: string, search: string): string | null {
  if (NON_PAGE_PATH.test(pathname)) return null;
  const alias = aliasTarget(trimSlash(pathname), search);
  return alias ? `${alias.path}${alias.rest}` : null;
}

/**
 * True for a same-origin relative path that is safe to redirect to: starts with one `/`, no backslash and no
 * control character (browsers strip tabs and newlines, so `/\t/evil.com` would become `//evil.com`).
 */
export function isSafeLocalPath(path: string): boolean {
  // eslint-disable-next-line no-control-regex
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') && !/[\u0000-\u001f\u007f]/.test(path);
}

/**
 * Where a signed-out visitor to `pathname` goes to sign in: the login with `from` set to the page they
 * wanted (only a same-origin relative path is kept), or the plain login for none, an unsafe path, `/` and the
 * login page itself.
 */
export function loginHrefFor(pathname: string | null | undefined): string {
  const login = '/login';
  if (!pathname || pathname === '/' || !isSafeLocalPath(pathname)) return login;
  if (pathname === login || pathname.startsWith(login + '/')) return login;
  return `${login}?from=${encodeURIComponent(pathname)}`;
}
