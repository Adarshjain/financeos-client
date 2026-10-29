import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConcealProvider } from '../Conceal/Conceal';
import { Hero } from './Hero';

describe('Hero', () => {
  it('renders the headline with label and change line', () => {
    render(<Hero label="Net worth" value="₹12,00,000" change={{ text: '+₹1,240 today', tone: 'positive' }} />);
    expect(screen.getByText('Net worth')).toBeInTheDocument();
    expect(screen.getByText('₹12,00,000')).toBeInTheDocument();
    expect(screen.getByText('+₹1,240 today')).toBeInTheDocument();
  });

  it('colours the headline figure with valueTone', () => {
    render(<Hero value="−₹4,200" valueTone="danger" />);
    expect(screen.getByText('−₹4,200')).toHaveClass('text-danger');
  });

  it('shows no label or change when not given', () => {
    const { container } = render(<Hero value="₹5" />);
    expect(container.querySelectorAll('.text-ink-3')).toHaveLength(0);
    expect(container.querySelector('.grid')).toBeNull();
  });

  it('renders figures with label, tone and caption', () => {
    render(
      <Hero
        value="₹1"
        figures={[
          { label: 'Invested', value: '₹10' },
          { label: 'Unrealised P&L', value: '+₹2', tone: 'positive', caption: '+20%' },
        ]}
      />,
    );
    expect(screen.getByText('Invested')).toBeInTheDocument();
    expect(screen.getByText('+₹2')).toHaveClass('text-positive');
    expect(screen.getByText('+20%')).toBeInTheDocument();
  });

  it('caps the small figures at three', () => {
    render(
      <Hero
        value="₹1"
        figures={['a', 'b', 'c', 'd'].map((l) => ({ label: `fig-${l}`, value: l }))}
      />,
    );
    expect(screen.queryByText('fig-d')).toBeNull();
    expect(screen.getByText('fig-c')).toBeInTheDocument();
  });

  it('lays three figures three across from desk up, two across below', () => {
    const { container } = render(
      <Hero value="₹1" figures={['a', 'b', 'c'].map((l) => ({ label: l, value: l }))} />,
    );
    expect(container.querySelector('.grid')).toHaveClass('grid-cols-2', 'desk:grid-cols-3');
  });

  it('keeps thirds from desk up for two figures, so they line up with three-figure heroes', () => {
    const { container } = render(<Hero value="₹1" figures={['a', 'b'].map((l) => ({ label: l, value: l }))} />);
    expect(container.querySelector('.grid')).toHaveClass('grid-cols-2', 'desk:grid-cols-3');
  });

  it('renders the children slot under the figures', () => {
    render(
      <Hero value="₹1" figures={[{ label: 'EMI', value: '₹2' }]}>
        <div data-testid="slot" />
      </Hero>,
    );
    const slot = screen.getByTestId('slot');
    expect(slot.previousElementSibling).toHaveClass('grid');
  });

  it('Skeleton mirrors the figure grid', () => {
    const { container } = render(<Hero.Skeleton label change figures={3} />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.grid')).toHaveClass('desk:grid-cols-3');
    expect(container.querySelectorAll('.grid > div')).toHaveLength(3);
  });

  it('conceals every amount while amounts are hidden', () => {
    render(
      <ConcealProvider concealed>
        <Hero value="₹12,00,000" change={{ text: '+₹1,240 today' }} figures={[{ label: 'Cash', value: '₹3,10,000', caption: '1 bank' }]} />
      </ConcealProvider>,
    );
    expect(screen.queryByText(/12,00,000|1,240|3,10,000/)).toBeNull();
    expect(screen.getByText('1 bank')).toBeInTheDocument();
  });
});
