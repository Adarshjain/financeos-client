'use client';

import { areaError } from '@/features/shell/areaError';

/** The list layout already mounts the app bar, so this renders inside it. */
export default areaError({ what: 'dashboards', framed: true });
