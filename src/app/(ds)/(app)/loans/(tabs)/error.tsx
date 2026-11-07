'use client';

import { areaError } from '@/features/shell/areaError';

/** The Loans layout already mounts the app bar, so this renders inside them. */
export default areaError({ what: 'loans', framed: true });
