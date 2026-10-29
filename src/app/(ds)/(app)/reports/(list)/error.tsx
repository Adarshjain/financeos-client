'use client';

import { areaError } from '@/features/shell/areaError';

/** The Reports layout already mounts the app bar, so this renders inside it. */
export default areaError({ what: 'reports', framed: true });
