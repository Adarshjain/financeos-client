/**
 * The one place that knows which pages are built in Dinero and where they live.
 * Dinero code links with `appHref('/legacy/path')`: a path whose Dinero page exists goes to it, every
 * other path stays Legacy. Nothing outside this file (and the `(ds)` app tree) hardcodes `/ds`.
 *
 * Plain module (no 'use client') so server components can call it.
 *
 * BIG-BANG SWAP: set `DS_PREFIX` to '' and this becomes the identity (`appHref(p) === p`,
 * `normalisePathname(p) === p`). Then delete the aliases and built list.
 */
export const DS_PREFIX = '/ds';

/** The Dinero index page (the logo link). */
export const DS_HOME_HREF = DS_PREFIX || '/';

/** Legacy paths that moved: Legacy path to the neutral path of the Dinero page that replaces it. */
const LEGACY_ALIASES: Record<string, string> = {
  '/settings/llm-keys': '/settings/ai',
  '/settings/gmail': '/settings/connections',
  '/settings/jobs': '/settings/activity',
  '/debug': '/settings/debug',
  '/rules/categories': '/transactions/categories',
  '/rules': '/transactions/rules',
};

/** Neutral (Legacy-shaped) paths that have a Dinero page, as full-pathname patterns. */
const BUILT_ROUTES: RegExp[] = [
  /^\/(login|signup|offline)$/,
  /^\/inbox$/,
  /^\/upcoming(\/calendar)?$/,
  /^\/notifications$/,
  /^\/accounts$/,
  /^\/accounts\/[^/]+(\/(cards|rewards|statements))?$/,
  // The list, Import and an import's page; /transactions/review stays Legacy.
  /^\/transactions(\/import(\/[^/]+)?)?$/,
  /^\/transactions\/(categories|rules)$/,
  /^\/settings(\/(activity|connections|ai|notifications|debug))?$/,
  /^\/loans(\/lendings)?$/,
  // A loan's page; /loans/calendar is its own Legacy page, not a loan id.
  /^\/loans\/(?!calendar$)[^/]+$/,
  // A person's page.
  /^\/loans\/lendings\/[^/]+$/,
  // Holdings, every Investments tab page (tradebook, dividends, fno, corporate-actions, instruments) and a holding's page.
  /^\/investments(\/[^/]+)?$/,
  // Rewards overview and a card's rewards page. Which card? is not built yet, so it stays Legacy.
  /^\/rewards$/,
  /^\/rewards\/cards\/[^/]+$/,
  // Earning rules.
  /^\/rewards\/rules$/,
  // The Reports list only; New report and a report's editor stay Legacy until they are built.
  /^\/reports$/,
];

/** Splits '/a/b?x=1#h' into the pathname and the rest ('?x=1#h'). */
function splitPath(path: string): [string, string] {
  const i = path.search(/[?#]/);
  return i === -1 ? [path, ''] : [path.slice(0, i), path.slice(i)];
}

/** True when the neutral pathname has a built Dinero page. */
export function isBuiltRoute(pathname: string): boolean {
  return BUILT_ROUTES.some((r) => r.test(pathname));
}

/**
 * Where to link for a Legacy-shaped path: the Dinero page when one is built, else the path unchanged.
 * Query string and hash are kept. Non-app values (external URLs, relative, protocol-relative) pass through.
 */
export function appHref(legacyPath: string): string {
  if (!legacyPath.startsWith('/') || legacyPath.startsWith('//')) return legacyPath;
  const [rawPath, rest] = splitPath(legacyPath);
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;
  const neutral = LEGACY_ALIASES[path] ?? path;
  return isBuiltRoute(neutral) ? `${DS_PREFIX}${neutral}${rest}` : legacyPath;
}

/** The Legacy-shaped path of a current pathname (drops the Dinero prefix), for active-item matching. */
export function normalisePathname(pathname: string): string {
  if (!DS_PREFIX) return pathname;
  if (pathname === DS_PREFIX || pathname === `${DS_PREFIX}/`) return '/';
  return pathname.startsWith(`${DS_PREFIX}/`) ? pathname.slice(DS_PREFIX.length) : pathname;
}

/** True for a path inside the Dinero area. */
export function isDsPath(pathname: string): boolean {
  return (DS_PREFIX as string) !== '' && (pathname === DS_PREFIX || pathname.startsWith(DS_PREFIX + '/'));
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
 * wanted (only a same-origin relative path is kept), or the plain login for Legacy paths.
 */
export function loginHrefFor(pathname: string | null | undefined): string {
  if (!pathname || !isDsPath(pathname) || !isSafeLocalPath(pathname)) {
    return '/login';
  }
  const login = appHref('/login');
  if (pathname === login || pathname.startsWith(login + '/')) return login;
  return `${login}?from=${encodeURIComponent(pathname)}`;
}
