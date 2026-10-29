'use client';

import { areaError } from '@/features/shell/areaError';

/** The public pages have no app bar, so the boundary renders bare. */
export default areaError({ what: 'this page', framed: true });
