/**
 * The one place that knows where Dinero and Legacy pages live.
 * Dinero owns the plain paths (`/accounts`, `/dashboard`, ...). Legacy is kept under `/legacy/...` until it is
 * deleted (then delete the aliases, `legacyHref` and the Legacy-only list too). Code that links to an app page
 * writes the plain path and calls `appHref(path)`: a path whose Dinero page exists stays as it is, every other
 * path goes to its Legacy page. Legacy code links with `legacyHref(path)`.
 *
 * Plain module (no 'use client') so server components and the proxy can call it.
 */
export const DS_PREFIX = '';

/** Where the Legacy app is served. */
export const LEGACY_PREFIX = '/legacy';

/** The Dinero home (the logo link). */
export const DS_HOME_HREF = '/dashboard';

/** Legacy paths that moved: Legacy path to the plain path of the Dinero page that replaces it. */
const LEGACY_ALIASES: Record<string, string> = {
  '/settings/llm-keys': '/settings/ai',
  '/settings/gmail': '/settings/connections',
  '/settings/jobs': '/settings/activity',
  '/debug': '/settings/debug',
  '/rules/categories': '/transactions/categories',
  '/rules': '/transactions/rules',
  '/rewards/recommend': '/rewards/which-card',
};

/** Legacy's own Needs-review page; Dinero Transactions has it as a filter (see `reviewQuery`). */
const REVIEW_PATH = '/transactions/review';

/** Legacy pages with no Dinero page and no alias: a plain path to one of them is served under /legacy. */
const LEGACY_ONLY_ROUTES: RegExp[] = [/^\/settings\/ingest$/, /^\/loans\/calendar$/];

/** Paths that are not pages (API, OAuth callback, static files): never prefixed. */
const NON_PAGE_PATH = /^\/(api|auth|handbook|storybook|serwist|icons|brand|manifest\.webmanifest)(\/|$)/;

/** The Dinero Transactions `reason` values (lower case); Legacy review links carry the enum names. */
const REVIEW_REASON_PARAMS = ['unreconciled', 'category_unverified', 'duplicate_suspect', 'date_corrected'];

/** Plain paths that have a Dinero page, as full-pathname patterns. */
const BUILT_ROUTES: RegExp[] = [
  // The root (redirects to Home) and the review index.
  /^\/(ds)?$/,
  /^\/(login|signup|offline|locked)$/,
  /^\/inbox$/,
  /^\/upcoming(\/calendar)?$/,
  /^\/notifications$/,
  /^\/accounts$/,
  /^\/accounts\/[^/]+(\/(cards|rewards|statements))?$/,
  // The list, Import and an import's page (/transactions/review is a filter of the list, see the aliases).
  /^\/transactions(\/import(\/[^/]+)?)?$/,
  /^\/transactions\/(categories|rules)$/,
  /^\/settings(\/(activity|connections|ai|notifications|debug))?$/,
  /^\/loans(\/lendings)?$/,
  // A loan's page; /loans/calendar is a Legacy page, not a loan id.
  /^\/loans\/(?!calendar$)[^/]+$/,
  // A person's page.
  /^\/loans\/lendings\/[^/]+$/,
  // Holdings, every Investments tab page (tradebook, dividends, fno, corporate-actions, instruments) and a holding's page.
  /^\/investments(\/[^/]+)?$/,
  // Rewards overview, a card's rewards page, Earning rules and Which card?.
  /^\/rewards$/,
  /^\/rewards\/cards\/[^/]+$/,
  /^\/rewards\/rules$/,
  /^\/rewards\/which-card$/,
  // The Reports list, New report and a report's editor (opening a report opens its editor).
  /^\/reports(\/[^/]+)?$/,
  // Home (the default dashboard), the Dashboards list, New dashboard and a dashboard's page (view and edit).
  /^\/dashboard$/,
  /^\/dashboards(\/[^/]+)?$/,
  // Ask the data: a new chat and one conversation.
  /^\/chat(\/[^/]+)?$/,
];

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

/** True for a path inside the Legacy app. */
export function isLegacyPath(pathname: string): boolean {
  return pathname === LEGACY_PREFIX || pathname.startsWith(LEGACY_PREFIX + '/');
}

/** True when the plain pathname has a built Dinero page. */
export function isBuiltRoute(pathname: string): boolean {
  return BUILT_ROUTES.some((r) => r.test(pathname));
}

/**
 * Legacy's Needs-review query as a Dinero Transactions query: `review=needs_review` first, `account=a,b`
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

/** The Dinero page that replaces a Legacy path (an alias), with its query: null when there is no alias. */
function aliasTarget(path: string, rest: string): { path: string; rest: string } | null {
  if (path === REVIEW_PATH) return { path: '/transactions', rest: reviewQuery(rest) };
  const to = LEGACY_ALIASES[path];
  return to ? { path: to, rest } : null;
}

/**
 * Where to link for an app path: the Dinero page when one is built (after aliases), else its Legacy page
 * (`/legacy` + path). Query string and hash are kept. Non-app values (external URLs, relative,
 * protocol-relative), non-page paths (`/api`, `/auth`, ...) and paths already under /legacy pass through.
 */
export function appHref(path: string): string {
  if (!isAppPath(path)) return path;
  const [rawPath, rest] = splitPath(path);
  const pathname = trimSlash(rawPath);
  if (NON_PAGE_PATH.test(pathname) || isLegacyPath(pathname)) return path;
  const alias = aliasTarget(pathname, rest);
  const target = alias?.path ?? pathname;
  if (isBuiltRoute(target)) return `${target}${alias ? alias.rest : rest}`;
  return `${LEGACY_PREFIX}${path}`;
}

/**
 * Where to link, from Legacy code, for an app path: `/legacy` + path. Non-app values, paths already under
 * /legacy and non-page paths pass through.
 */
export function legacyHref(path: string): string {
  if (!isAppPath(path)) return path;
  const [rawPath] = splitPath(path);
  const pathname = trimSlash(rawPath);
  if (NON_PAGE_PATH.test(pathname) || isLegacyPath(pathname)) return path;
  return pathname === '/' ? `${LEGACY_PREFIX}${path.slice(1)}` : `${LEGACY_PREFIX}${path}`;
}

/**
 * Where a request for a plain path (not under /legacy) must be redirected, or null to serve it: a Legacy
 * alias goes to its Dinero page (query merged), a Legacy-only page goes under /legacy. `search` is '?a=b' or ''.
 */
export function rootRedirectFor(pathname: string, search: string): string | null {
  if (isLegacyPath(pathname) || NON_PAGE_PATH.test(pathname)) return null;
  const path = trimSlash(pathname);
  const alias = aliasTarget(path, search);
  if (alias) return `${alias.path}${alias.rest}`;
  if (LEGACY_ONLY_ROUTES.some((r) => r.test(path))) return `${LEGACY_PREFIX}${path}${search}`;
  return null;
}

/** The plain path of a current pathname (drops /legacy), for active-item matching. */
export function normalisePathname(pathname: string): string {
  if (pathname === LEGACY_PREFIX || pathname === `${LEGACY_PREFIX}/`) return '/';
  return pathname.startsWith(`${LEGACY_PREFIX}/`) ? pathname.slice(LEGACY_PREFIX.length) : pathname;
}

/** True for a path inside the Dinero area: everything that is not under /legacy. */
export function isDsPath(pathname: string): boolean {
  return !isLegacyPath(pathname);
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
 * Where a signed-out visitor to `pathname` goes to sign in: the Dinero login with `from` set to the page they
 * wanted (Legacy pages included; only a same-origin relative path is kept), or the plain login for none, an
 * unsafe path, `/` and the login pages themselves.
 */
export function loginHrefFor(pathname: string | null | undefined): string {
  const login = '/login';
  if (!pathname || pathname === '/' || !isSafeLocalPath(pathname)) return login;
  if (pathname === login || pathname.startsWith(login + '/')) return login;
  if (pathname === `${LEGACY_PREFIX}/login` || pathname.startsWith(`${LEGACY_PREFIX}/login/`)) return login;
  return `${login}?from=${encodeURIComponent(pathname)}`;
}
