import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusWord, StatusWords } from './StatusWords';

describe('StatusWord and StatusWords components', () => {
  it('renders StatusWord with appropriate tone classes', () => {
    const { rerender } = render(<StatusWord tone="amber">Unreconciled</StatusWord>);
    expect(screen.getByText('Unreconciled')).toHaveClass('text-warning', 'font-bold');

    rerender(<StatusWord tone="blue">Refund</StatusWord>);
    expect(screen.getByText('Refund')).toHaveClass('text-info', 'font-semibold');

    rerender(<StatusWord tone="grey">Gmail</StatusWord>);
    expect(screen.getByText('Gmail')).toHaveClass('text-ink-3', 'font-medium');

    rerender(<StatusWord tone="green">Verified</StatusWord>);
    expect(screen.getByText('Verified')).toHaveClass('text-positive-strong', 'font-bold');
  });

  it('renders chain icon for link tone', () => {
    const { container } = render(<StatusWord tone="link">Refund</StatusWord>);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders multiple status words separated by dot from items prop', () => {
    render(
      <StatusWords
        prefix="HDFC Regalia"
        items={[
          { tone: 'amber', label: 'Unreconciled' },
          { tone: 'blue', label: 'Refund' },
          { tone: 'grey', label: 'Gmail' },
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
        <StatusWord tone="amber">Unverified</StatusWord>
        <StatusWord tone="grey">LLM-generated</StatusWord>
      </StatusWords>,
    );

    expect(screen.getByText('Unverified')).toBeInTheDocument();
    expect(screen.getByText('LLM-generated')).toBeInTheDocument();
    expect(screen.getByText('·')).toBeInTheDocument();
  });
});
