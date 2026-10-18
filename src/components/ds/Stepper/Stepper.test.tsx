import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Stepper } from './Stepper';

const steps = [
  { id: 'files', label: 'Files' },
  { id: 'match', label: 'Match instruments' },
  { id: 'reconcile', label: 'Reconcile' },
  { id: 'done', label: 'Done' },
];
const items = () => screen.getAllByRole('listitem');

describe('Stepper', () => {
  it('renders every step in order as an ordered list', () => {
    render(<Stepper steps={steps} current={0} />);
    expect(screen.getByRole('list').tagName).toBe('OL');
    expect(items().map((li) => li.textContent)).toEqual(['1Files', '2Match instruments', '3Reconcile', '4Done']);
  });

  it('marks steps before current done, current current, after it upcoming', () => {
    render(<Stepper steps={steps} current={2} />);
    expect(items().map((li) => li.dataset.state)).toEqual(['done', 'done', 'current', 'upcoming']);
  });

  it('done steps show a check icon instead of their number', () => {
    render(<Stepper steps={steps} current={2} />);
    const [files, , reconcile, last] = items();
    expect(files.querySelector('svg')).not.toBeNull();
    expect(files.textContent).toBe('Files');
    expect(reconcile.querySelector('svg')).toBeNull();
    expect(reconcile.textContent).toBe('3Reconcile');
    expect(last.textContent).toBe('4Done');
  });

  it('only the current step carries aria-current="step"', () => {
    render(<Stepper steps={steps} current={1} />);
    expect(items().map((li) => li.getAttribute('aria-current'))).toEqual([null, 'step', null, null]);
  });

  it('styles each state with its tokens', () => {
    render(<Stepper steps={steps} current={1} />);
    const [done, current, upcoming] = items();
    expect(done).toHaveClass('text-ink-3');
    expect(done.firstElementChild).toHaveClass('bg-brand-tint', 'text-brand');
    expect(current).toHaveClass('text-positive-strong');
    expect(current.firstElementChild).toHaveClass('bg-brand', 'text-on-brand');
    expect(upcoming).toHaveClass('text-ink-3');
    expect(upcoming.firstElementChild).toHaveClass('bg-line-soft', 'text-ink-3');
  });

  it('past the last step every step is done', () => {
    render(<Stepper steps={steps} current={4} />);
    expect(items().every((li) => li.dataset.state === 'done')).toBe(true);
  });

  it('forwards native attributes and layout className', () => {
    render(<Stepper steps={steps} current={0} aria-label="Import steps" className="mt-space-8" />);
    const list = screen.getByRole('list', { name: 'Import steps' });
    expect(list).toHaveClass('mt-space-8', 'flex', 'flex-wrap');
  });
});
