import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Combobox } from '@/components/Combobox';

const mockOptions = [
  { id: 'c1', name: 'Food' },
  { id: 'c2', name: 'Shopping' },
];

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('Combobox', () => {
  it('renders placeholder and label', () => {
    render(
      <Combobox
        label="Categories"
        placeholder="Select categories"
        options={mockOptions}
        value={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Categories')[0]).toBeInTheDocument();
    expect(screen.getByText('Select categories')).toBeInTheDocument();
  });

  it('renders selected badges and allows removing selection', () => {
    const onChange = vi.fn();
    render(
      <Combobox
        options={mockOptions}
        value={[{ id: 'c1', name: 'Food' }]}
        onChange={onChange}
      />,
    );

    const removeBtn = screen.getByRole('button', { name: 'Remove Food' });
    expect(removeBtn).toBeInTheDocument();

    fireEvent.click(removeBtn);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('opens popover and allows selecting options', () => {
    const onChange = vi.fn();
    render(
      <Combobox
        options={mockOptions}
        value={[]}
        onChange={onChange}
      />,
    );

    const trigger = screen.getByText('Categories');
    fireEvent.click(trigger);

    const foodOption = screen.getByText('Food');
    fireEvent.click(foodOption);

    expect(onChange).toHaveBeenCalledWith([{ id: 'c1', name: 'Food' }]);
  });
});
