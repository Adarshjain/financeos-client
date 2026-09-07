const CROCKFORD_PATTERN = /^[0-9A-HJKMNP-TV-Z]{8}$/i;
const REF_PATTERN = /^[A-Za-z0-9\-_]{1,64}$/;

export function isErrorId(id: string | null | undefined): boolean {
  if (!id) return false;
  return CROCKFORD_PATTERN.test(id.trim());
}

export function isValidRef(ref: string | null | undefined): boolean {
  if (!ref) return false;
  return REF_PATTERN.test(ref.trim());
}

export function refOf(input: {
  errorId?: string | null;
  requestId?: string | null;
  digest?: string | null;
} | null | undefined): string | undefined {
  if (!input) return undefined;
  if (input.errorId && input.errorId.trim()) return input.errorId.trim();
  if (input.requestId && input.requestId.trim()) return input.requestId.trim();
  if (input.digest && input.digest.trim()) return input.digest.trim();
  return undefined;
}
