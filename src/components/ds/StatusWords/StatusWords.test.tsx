import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusWord, StatusWords } from './StatusWords';

describe('StatusWord and StatusWords components', () => {
  it('renders StatusWord with appropriate semantic tone classes', () => {
    const { rerender } = render(<StatusWord tone="warning">Unreconciled</StatusWord>);
    expect(screen.getByText('Unreconciled')).toHaveClass('text-warning', 'font-bold');

    rerender(<StatusWord tone="info">Refund</StatusWord>);
    expect(screen.getByText('Refund')).toHaveClass('text-info', 'font-semibold');

    rerender(<StatusWord tone="neutral">Gmail</StatusWord>);
    expect(screen.getByText('Gmail')).toHaveClass('text-ink-3', 'font-medium');

    rerender(<StatusWord>Default neutral</StatusWord>);
    expect(screen.getByText('Default neutral')).toHaveClass('text-ink-3', 'font-medium');

    rerender(<StatusWord tone="success">Verified</StatusWord>);
    expect(screen.getByText('Verified')).toHaveClass('text-positive-strong', 'font-bold');
  });

  it('renders icon only when passed explicitly', () => {
    const { container, rerender } = render(<StatusWord tone="info">Refund</StatusWord>);
    expect(container.querySelector('svg')).toBeNull();

    rerender(<StatusWord tone="info" icon="link">Refund</StatusWord>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders multiple status words separated by dot from items prop', () => {
    render(
      <StatusWords
        prefix="HDFC Regalia"
        items={[
          { tone: 'warning', label: 'Unreconciled' },
          { tone: 'info', label: 'Refund', icon: 'link' },
          { tone: 'neutral', label: 'Gmail' },
        ]}
      />,
    );

    expect(screen.getByText('HDFC Regalia')).toBeInTheDocument();
    expect(screen.getByText('Unreconciled')).toBeInTheDocument();
    expect(screen.getByText('Refund')).toBeInTheDocument();
    expect(screen.getByText('Gmail')).toBeInTheDocument();
    expect(screen.getAllByText('·')).toHaveLength(3);
  });

  it('renders multiple status words separated by dot from children composition', () => {
    render(
      <StatusWords>
        <StatusWord tone="warning">Unverified</StatusWord>
        <StatusWord tone="neutral">LLM-generated</StatusWord>
      </StatusWords>,
    );

    expect(screen.getByText('Unverified')).toBeInTheDocument();
    expect(screen.getByText('LLM-generated')).toBeInTheDocument();
    expect(screen.getByText('·')).toBeInTheDocument();
  });
});
