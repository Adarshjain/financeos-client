'use client';

import { areaError } from '@/features/shell/areaError';

/** The Investments layout already mounts the app bar and tabs, so this renders inside them. */
export default areaError({ what: 'investments', framed: true });
