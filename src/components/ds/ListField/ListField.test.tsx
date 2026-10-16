import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ListField } from './ListField';

describe('ListField', () => {
  it('renders label and value', () => {
    render(<ListField label="Account" value="HDFC Regalia ••7741" />);
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('HDFC Regalia ••7741')).toBeInTheDocument();
  });

  it('renders children when value is not passed', () => {
    render(
      <ListField label="Custom">
        <span data-testid="custom-value">Custom content</span>
      </ListField>,
    );
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByTestId('custom-value')).toBeInTheDocument();
  });

  it('handles borderTop prop', () => {
    const { container: withBorder } = render(
      <ListField label="With Border" borderTop={true} />,
    );
    expect(withBorder.firstChild).toHaveClass('border-t');

    const { container: withoutBorder } = render(
      <ListField label="Without Border" borderTop={false} />,
    );
    expect(withoutBorder.firstChild).not.toHaveClass('border-t');
  });
});
