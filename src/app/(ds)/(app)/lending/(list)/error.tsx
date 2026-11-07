'use client';

import { areaError } from '@/features/shell/areaError';

/** The Lending layout already mounts the app bar, so this renders inside it. */
export default areaError({ what: 'lending', framed: true });
