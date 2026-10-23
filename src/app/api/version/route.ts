import { buildVersion } from '@/lib/buildVersion';

export const dynamic = 'force-dynamic';

/** The currently deployed build id; open /ds tabs compare it with the one they loaded (NewVersionWatcher). */
export function GET() {
  return Response.json({ version: buildVersion() }, { headers: { 'Cache-Control': 'no-store' } });
}
