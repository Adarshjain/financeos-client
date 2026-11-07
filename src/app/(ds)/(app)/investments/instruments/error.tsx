'use client';

import { areaError } from '@/features/shell/areaError';

/** The Instruments layout already mounts the app bar, so this renders inside it. */
export default areaError({ what: 'instruments', framed: true });
