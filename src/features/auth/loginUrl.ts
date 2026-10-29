import { appHref, isSafeLocalPath } from '@/features/shell/routes';
import { first, type SearchParamsRecord } from '@/features/shell/searchParams';

/** What a /login address asks for: `?from=` is where a signed-in visitor goes instead. Only a local path counts; anything else goes Home. */
export function parseLoginUrl(params: SearchParamsRecord): { destination: string } {
  const from = first(params.from);
  return { destination: appHref(from && isSafeLocalPath(from) ? from : '/dashboard') };
}
