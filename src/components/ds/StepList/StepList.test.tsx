import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { StepList, type StepListStep } from './StepList';

const steps: StepListStep[] = [
  { id: 'a', label: 'Read the file', meta: '0.4s', state: 'done', detail: 'Two sheets', code: 'select 1' },
  { id: 'b', label: 'Run the query', state: 'running' },
  { id: 'c', label: 'Draw the chart', state: 'failed' },
];

describe('StepList', () => {
  it('live: renders labels with state styling and meta, no container or code', () => {
    const { container } = render(<StepList variant="live" steps={steps} />);
    expect(screen.getByText('Read the file')).toHaveClass('text-ink-2');
    expect(screen.getByText('Run the query')).toHaveClass('text-body-strong', 'text-ink');
    expect(screen.getByText('Draw the chart')).toHaveClass('text-danger');
    expect(screen.getByText('0.4s')).toHaveClass('text-ink-faint');
    expect(container.firstChild).not.toHaveClass('border');
    expect(screen.queryByText('Show details')).toBeNull();
    expect(screen.queryByText('Two sheets')).toBeNull();
  });

  it('renders the icon for each state', () => {
    const { container } = render(<StepList variant="live" steps={steps} />);
    expect(container.querySelectorAll('svg')).toHaveLength(3);
    expect(container.querySelector('svg.animate-spin')).not.toBeNull();
    expect(container.querySelector('svg.text-danger')).not.toBeNull();
  });

  it('card: bordered surface with detail and a code toggle', () => {
    const { container } = render(<StepList variant="card" steps={steps} />);
    expect(container.firstChild).toHaveClass('border', 'divide-line-soft', 'bg-surface');
    expect(screen.getByText('Two sheets')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByText('select 1')).toBeNull();
  });

  it('card: toggles the code open and closed with custom labels', () => {
    render(
      <StepList variant="card" steps={steps} showCodeLabel="Show SQL" hideCodeLabel="Hide SQL" />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show SQL' }));
    expect(screen.getByText('select 1')).toHaveClass('font-mono', 'bg-sunken');
    fireEvent.click(screen.getByRole('button', { name: 'Hide SQL' }));
    expect(screen.queryByText('select 1')).toBeNull();
  });

  it('card: controlled openIds reports changes and does not change itself', () => {
    const onOpenIdsChange = vi.fn();
    render(
      <StepList variant="card" steps={steps} openIds={[]} onOpenIdsChange={onOpenIdsChange} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));
    expect(onOpenIdsChange).toHaveBeenCalledWith(['a']);
    expect(screen.queryByText('select 1')).toBeNull();
  });

  it('card: defaultOpenIds starts open', () => {
    render(<StepList variant="card" steps={steps} defaultOpenIds={['a']} />);
    expect(screen.getByText('select 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide details' })).toBeInTheDocument();
  });
});
