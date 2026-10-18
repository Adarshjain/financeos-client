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
const circle = (li: HTMLElement) => li.firstElementChild!.firstElementChild as HTMLElement;
const connector = (li: HTMLElement) => li.children[1] as HTMLElement | undefined;
const segments = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('.lg\\:hidden [data-state]'));

describe('Stepper', () => {
  describe('desktop form', () => {
    it('renders every step in order as an ordered list hidden below lg', () => {
      render(<Stepper steps={steps} current={0} />);
      const list = screen.getByRole('list');
      expect(list.tagName).toBe('OL');
      expect(list).toHaveClass('hidden', 'lg:flex');
      expect(items().map((li) => li.textContent)).toEqual(['1Files', '2Match instruments', '3Reconcile', '4Done']);
    });

    it('marks steps before current done, current current, after it upcoming', () => {
      render(<Stepper steps={steps} current={2} />);
      expect(items().map((li) => li.dataset.state)).toEqual(['done', 'done', 'current', 'upcoming']);
    });

    it('done steps show a check icon instead of their number', () => {
      render(<Stepper steps={steps} current={2} />);
      const [files, , reconcile, last] = items();
      expect(circle(files).querySelector('svg')).not.toBeNull();
      expect(files.textContent).toBe('Files');
      expect(circle(reconcile).querySelector('svg')).toBeNull();
      expect(reconcile.textContent).toBe('3Reconcile');
      expect(last.textContent).toBe('4Done');
    });

    it('only the current step carries aria-current="step"', () => {
      render(<Stepper steps={steps} current={1} />);
      expect(items().map((li) => li.getAttribute('aria-current'))).toEqual([null, 'step', null, null]);
    });

    it('styles each circle with its state tokens', () => {
      render(<Stepper steps={steps} current={1} />);
      const [done, current, upcoming] = items();
      expect(circle(done)).toHaveClass('bg-brand', 'text-on-brand');
      expect(circle(current)).toHaveClass('bg-brand', 'text-on-brand', 'ring-4', 'ring-brand-tint');
      expect(circle(upcoming)).toHaveClass('border', 'border-line-strong', 'bg-surface', 'text-ink-3');
    });

    it('joins steps with lines that fill up to the current step; the last step has none', () => {
      render(<Stepper steps={steps} current={2} />);
      const [files, match, reconcile, last] = items();
      expect(connector(files)).toHaveClass('bg-brand');
      expect(connector(match)).toHaveClass('bg-brand');
      expect(connector(reconcile)).toHaveClass('bg-line');
      expect(connector(last)).toBeUndefined();
      expect(last).not.toHaveClass('flex-1');
    });

    it('past the last step every step is done and every line filled', () => {
      render(<Stepper steps={steps} current={4} />);
      expect(items().every((li) => li.dataset.state === 'done')).toBe(true);
      expect(items().slice(0, 3).every((li) => connector(li)!.classList.contains('bg-brand'))).toBe(true);
    });
  });

  describe('phone form', () => {
    it('shows "Step N of M" and the current step name, hidden from lg', () => {
      const { container } = render(<Stepper steps={steps} current={2} />);
      const phone = container.querySelector('.lg\\:hidden')!;
      expect(phone).toHaveTextContent('Step 3 of 4');
      expect(phone).toHaveTextContent('Reconcile');
      expect(phone).not.toHaveTextContent('Match instruments');
    });

    it('draws one bar segment per step, filled up to and including the current one', () => {
      const { container } = render(<Stepper steps={steps} current={1} />);
      const bar = segments(container);
      expect(bar).toHaveLength(4);
      expect(bar.map((s) => s.classList.contains('bg-brand'))).toEqual([true, true, false, false]);
      expect(bar.map((s) => s.dataset.state)).toEqual(['done', 'current', 'upcoming', 'upcoming']);
    });

    it('past the last step it stays on the last step with the bar full', () => {
      const { container } = render(<Stepper steps={steps} current={4} />);
      expect(container.querySelector('.lg\\:hidden')).toHaveTextContent('Step 4 of 4Done');
      expect(segments(container).every((s) => s.classList.contains('bg-brand'))).toBe(true);
    });

    it('takes overridable caption words', () => {
      const { container } = render(
        <Stepper steps={steps} current={0} stepLabel={(step, total) => `${step}/${total}`} />,
      );
      expect(container.querySelector('.lg\\:hidden')).toHaveTextContent('1/4Files');
    });
  });

  it('forwards ref, native attributes and layout className to the root', () => {
    const ref = { current: null as HTMLDivElement | null };
    const { container } = render(
      <Stepper ref={ref} steps={steps} current={0} aria-label="Import steps" className="mt-space-8" />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('aria-label', 'Import steps');
    expect(root).toHaveClass('mt-space-8', 'w-full');
  });
});
