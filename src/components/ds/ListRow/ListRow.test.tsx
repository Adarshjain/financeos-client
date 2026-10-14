import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  ListField,
  ListRow,
  ListRowDateTile,
  ListRowIconTile,
} from './ListRow';

describe('ListRow', () => {
  it('renders title and subtitle', () => {
    render(<ListRow title="Amex Platinum bill" subtitle="Card bill" />);
    expect(screen.getByText('Amex Platinum bill')).toBeInTheDocument();
    expect(screen.getByText('Card bill')).toBeInTheDocument();
  });

  it('renders leading element and trailing amount', () => {
    render(
      <ListRow
        leading={<span data-testid="leading-badge">Missing</span>}
        title="SBI Statement"
        amount="₹33,900"
      />,
    );
    expect(screen.getByTestId('leading-badge')).toBeInTheDocument();
    expect(screen.getByText('₹33,900')).toBeInTheDocument();
  });

  it('formats positive credit amounts with a plus sign', () => {
    render(
      <ListRow
        title="Rahul Sharma"
        amount="₹15,000"
        isCredit
      />,
    );
    const amountEl = screen.getByText('+₹15,000');
    expect(amountEl).toBeInTheDocument();
    expect(amountEl).toHaveClass('text-positive');
  });

  it('applies highlighted styling when highlighted or hl is true', () => {
    const { container: c1 } = render(<ListRow title="Row 1" highlighted />);
    expect(c1.firstChild).toHaveClass('ring-2', 'ring-brand', 'bg-brand-tint');

    const { container: c2 } = render(<ListRow title="Row 2" hl />);
    expect(c2.firstChild).toHaveClass('ring-2', 'ring-brand', 'bg-brand-tint');
  });

  it('applies disabled styling and aria-disabled attribute', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <ListRow title="Closed Account" disabled onClick={handleClick} />,
    );
    expect(container.firstChild).toHaveClass('opacity-50', 'pointer-events-none');
    expect(container.firstChild).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(container.firstChild as HTMLElement);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('handles click events and keyboard triggers when interactive', () => {
    const handleClick = vi.fn();
    render(
      <ListRow title="Interactive Row" onClick={handleClick} />,
    );
    const row = screen.getByRole('button');
    expect(row).toBeInTheDocument();

    fireEvent.click(row);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(row, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(row, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(3);
  });

  it('renders kebab button and handles click', () => {
    const handleKebab = vi.fn();
    render(<ListRow title="Dining out" kebab={handleKebab} />);
    const kebabBtn = screen.getByRole('button', { name: 'More options' });
    expect(kebabBtn).toBeInTheDocument();

    fireEvent.click(kebabBtn);
    expect(handleKebab).toHaveBeenCalledTimes(1);
  });
});

describe('ListField', () => {
  it('renders label and value', () => {
    render(<ListField label="Account" value="HDFC Regalia ••7741" />);
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('HDFC Regalia ••7741')).toBeInTheDocument();
  });
});

describe('ListRowDateTile', () => {
  it('renders day and month in date tile', () => {
    render(<ListRowDateTile day="15" month="OCT" />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('OCT')).toBeInTheDocument();
  });
});

describe('ListRowIconTile', () => {
  it('renders content with tone styling', () => {
    const { container } = render(
      <ListRowIconTile tone="info">EMI</ListRowIconTile>,
    );
    expect(container.firstChild).toHaveTextContent('EMI');
    expect(container.firstChild).toHaveClass('bg-info-tint', 'text-info');
  });
});
