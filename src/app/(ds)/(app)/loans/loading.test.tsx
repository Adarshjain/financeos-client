import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import DsLendingsLoading from './lendings/loading';
import DsLoansLoading from './loading';

describe('Loans & lendings loading states', () => {
  it('draws four tile skeletons and table skeleton rows on both tabs', () => {
    for (const Loading of [DsLendingsLoading, DsLoansLoading]) {
      const { container, unmount } = render(<Loading />);
      expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(8);
      unmount();
    }
  });
});
