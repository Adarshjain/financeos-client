import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ListField, ListRow } from './ListRow';

describe('ListRow', () => {
  it('renders title and subtitle with correct typography', () => {
    render(<ListRow title="Amex Platinum bill" subtitle="Card bill" />);
    const titleEl = screen.getByText('Amex Platinum bill');
    expect(titleEl).toBeInTheDocument();
    expect(titleEl).toHaveClass('text-body-strong');
    const subtitleEl = screen.getByText('Card bill');
    expect(subtitleEl).toBeInTheDocument();
    expect(subtitleEl).toHaveClass('text-label');
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

  it('formats positive credit amounts with a plus sign and tabular numbers', () => {
    render(
      <ListRow
        title="Rahul Sharma"
        amount="₹15,000"
        isCredit
      />,
    );
    const amountEl = screen.getByText('+₹15,000');
    expect(amountEl).toBeInTheDocument();
    expect(amountEl).toHaveClass('text-positive', 'tabular-nums');
  });

  it('applies highlighted styling with 4px stripe on brand-tint', () => {
    const { container: c1 } = render(<ListRow title="Row 1" highlighted />);
    expect(c1.firstChild).toHaveClass('border-l-4', 'border-l-brand-strong', 'bg-brand-tint');

    const { container: c2 } = render(<ListRow title="Row 2" hl />);
    expect(c2.firstChild).toHaveClass('border-l-4', 'border-l-brand-strong', 'bg-brand-tint');
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

  it('renders kebab button using Button and handles click', () => {
    const handleKebab = vi.fn();
    render(<ListRow title="Dining out" kebab={handleKebab} />);
    const kebabBtn = screen.getByRole('button', { name: 'More options' });
    expect(kebabBtn).toBeInTheDocument();

    fireEvent.click(kebabBtn);
    expect(handleKebab).toHaveBeenCalledTimes(1);
  });

  it('renders chevron icon when chevron prop is true', () => {
    const { container } = render(<ListRow title="Navigate" chevron />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-icon-sm', 'h-icon-sm');
  });
});

describe('ListField', () => {
  it('renders label and value with font-semibold value weight', () => {
    render(<ListField label="Account" value="HDFC Regalia ••7741" />);
    expect(screen.getByText('Account')).toBeInTheDocument();
    const valueEl = screen.getByText('HDFC Regalia ••7741');
    expect(valueEl).toBeInTheDocument();
    expect(valueEl).toHaveClass('font-semibold');
  });
});
