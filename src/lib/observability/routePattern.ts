const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC = /^\d+$/;
const HEX = /^[0-9a-f]{16,}$/i;

/** The first-level route segments of the app (src/app folders; a unit test keeps this in step). */
export const KNOWN_ROOT_SEGMENTS: readonly string[] = [
  'accounts', 'api', 'auth', 'chat', 'dashboard', 'dashboards', 'data-sources', 'ds', 'home', 'import', 'inbox',
  'investments', 'lending', 'loans', 'locked', 'login', 'notifications', 'offline', 'reports', 'rewards', 'settings',
  'signup', 'transactions', 'upcoming', 'welcome',
];

function isIdSegment(seg: string): boolean {
  if (UUID.test(seg) || NUMERIC.test(seg) || HEX.test(seg)) return true;
  // Opaque ids: long, mixed letters and digits.
  return seg.length >= 20 && /\d/.test(seg) && /[a-z]/i.test(seg);
}

/** Normalises a URL path to a low-cardinality route pattern; the query string and hash are dropped, unknown first segments become [unknown]. */
export function routePattern(path: string): string {
  const clean = path.split(/[?#]/)[0] || '/';
  const segs = clean.split('/').filter(Boolean);
  if (segs.length === 0) return '/';
  if (!KNOWN_ROOT_SEGMENTS.includes(segs[0])) return '/[unknown]';
  return '/' + segs.map((seg) => (isIdSegment(seg) ? '[id]' : seg.length > 32 ? '[id]' : seg)).join('/');
}
