import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConcealProvider } from '../Conceal/Conceal';
import { ListField } from './ListField';

describe('ListField with hidden amounts', () => {
  it('hides a ₹ value and keeps the label', () => {
    render(
      <ConcealProvider concealed>
        <ListField label="Own limit" value="₹1,00,000" />
      </ConcealProvider>,
    );
    expect(screen.getByText('Own limit')).toBeInTheDocument();
    expect(screen.getByText('₹ —')).toBeInTheDocument();
  });

  it('shows the value without a ConcealProvider', () => {
    render(<ListField label="Own limit" value="₹1,00,000" />);
    expect(screen.getByText('₹1,00,000')).toBeInTheDocument();
  });
});
