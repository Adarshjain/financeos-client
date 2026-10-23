// Uploads go straight from the browser to the API through the Vercel rewrite (no server
// action body in the path), so this is just a sensible client-side cap, not a platform limit.
export const MAX_REQUEST_MB = 25;
export const MAX_REQUEST_BYTES = MAX_REQUEST_MB * 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
