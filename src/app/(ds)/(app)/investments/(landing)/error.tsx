'use client';

import { areaError } from '@/features/shell/areaError';

/** The landing layout already mounts the app bar, so this renders inside it. */
export default areaError({ what: 'investments', framed: true });
