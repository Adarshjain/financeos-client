import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConcealProvider } from '../Conceal/Conceal';
import { Figures } from './Figures';

const three = ['a', 'b', 'c'].map((l) => ({ label: `lab-${l}`, value: l }));

describe('Figures', () => {
  it('renders label, figure, tone and caption', () => {
    render(<Figures figures={[{ label: 'Realised', value: '+₹2', tone: 'positive', caption: 'booked' }, { label: 'Qty', value: '5' }]} />);
    expect(screen.getByText('Realised')).toHaveClass('text-ink-3');
    expect(screen.getByText('+₹2')).toHaveClass('text-positive');
    expect(screen.getByText('booked')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('is two across on a phone and three from desk up by default', () => {
    const { container } = render(<Figures figures={three} />);
    expect(container.firstChild).toHaveClass('grid-cols-2', 'desk:grid-cols-3');
  });

  it('goes four across from desk up on request', () => {
    const { container } = render(<Figures figures={three} columns={4} />);
    expect(container.firstChild).toHaveClass('grid-cols-2', 'desk:grid-cols-4');
  });

  it('steps the figure text down and tightens the gaps at size sm', () => {
    const { container } = render(<Figures figures={[{ label: 'Qty', value: '5' }]} size="sm" />);
    expect(screen.getByText('5')).toHaveClass('text-title');
    expect(screen.getByText('5')).not.toHaveClass('text-figure');
    expect(container.firstChild).toHaveClass('gap-x-space-12', 'gap-y-space-6');
  });

  it('keeps the Hero figure style at the default size', () => {
    render(<Figures figures={[{ label: 'Qty', value: '5' }]} />);
    expect(screen.getByText('5')).toHaveClass('text-figure');
  });

  it('Skeleton follows size', () => {
    const { container } = render(<Figures.Skeleton count={3} size="sm" />);
    expect(container.firstChild).toHaveClass('gap-x-space-12');
  });

  it('renders nothing without figures', () => {
    const { container } = render(<Figures figures={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('conceals money strings but not captions without amounts', () => {
    render(
      <ConcealProvider concealed>
        <Figures figures={[{ label: 'Avg cost', value: '₹1,204.50', caption: '3 trades' }]} />
      </ConcealProvider>,
    );
    expect(screen.queryByText(/1,204/)).toBeNull();
    expect(screen.getByText('3 trades')).toBeInTheDocument();
  });

  it('Skeleton mirrors the grid', () => {
    const { container } = render(<Figures.Skeleton count={5} />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.firstChild).toHaveClass('desk:grid-cols-3');
    expect(container.querySelectorAll('.grid > div')).toHaveLength(5);
  });
});
