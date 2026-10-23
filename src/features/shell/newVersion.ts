/** Errors a browser throws when a lazy chunk or module from a previous deploy no longer exists. */
export function isChunkLoadError(reason: unknown): boolean {
  if (!reason || typeof reason !== 'object') return false;
  const { name, message } = reason as { name?: unknown; message?: unknown };
  if (name === 'ChunkLoadError') return true;
  return (
    typeof message === 'string' &&
    /Loading chunk .* failed|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
      message
    )
  );
}

/** The deployed build id, or null when the answer can't be read (offline, signed out, not JSON). */
export async function fetchDeployedVersion(): Promise<string | null> {
  try {
    const res = await fetch('/api/version', { cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) return null;
    const body = (await res.json()) as { version?: unknown };
    return typeof body.version === 'string' ? body.version : null;
  } catch {
    return null;
  }
}
