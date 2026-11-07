import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import DsLoansLoading from './loading';

describe('Loans loading state', () => {
  it('draws four tile skeletons and table skeleton rows', () => {
    const { container } = render(<DsLoansLoading />);
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(8);
  });
});
