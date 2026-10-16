import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { DateTile } from './DateTile';

describe('DateTile', () => {
  it('renders day and monthLabel in uppercase', () => {
    render(<DateTile day={15} monthLabel="OCT" />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('OCT')).toBeInTheDocument();
  });

  it('supports legacy month prop', () => {
    render(<DateTile day={28} month="NOV" />);
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('NOV')).toBeInTheDocument();
  });
});
