import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Popover } from './Popover';

describe('Popover', () => {
  it('renders trigger and opens popover content on click', () => {
    render(
      <Popover
        trigger={<button type="button">Open Popover</button>}
      >
        <div>Popover body content</div>
      </Popover>,
    );

    expect(screen.queryByText('Popover body content')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Popover' }));
    expect(screen.getByText('Popover body content')).toBeInTheDocument();
  });

  it('applies directional slide animation and sizing tokens', () => {
    render(
      <Popover
        defaultOpen
        trigger={<button type="button">Trigger</button>}
      >
        <div data-testid="popover-inner">Popover Content</div>
      </Popover>,
    );

    const inner = screen.getByTestId('popover-inner');
    const content = inner.parentElement;
    expect(content).toHaveClass('min-w-popover-trigger');
    expect(content).toHaveClass('max-w-container-sm');
    expect(content).toHaveClass('w-auto');
    expect(content).toHaveClass('shadow-level-2');
    expect(content).toHaveClass('rounded-ds-lg');
    expect(content).toHaveClass('data-side-bottom:slide-in-from-top-1');
    expect(content).toHaveClass('data-side-top:slide-in-from-bottom-1');
  });

  it('supports controlled open state and onOpenChange', () => {
    const ControlledTest = () => {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <Popover
          open={isOpen}
          onOpenChange={setIsOpen}
          trigger={<button type="button">Toggle</button>}
        >
          <div>Controlled Popover</div>
        </Popover>
      );
    };

    render(<ControlledTest />);
    expect(screen.queryByText('Controlled Popover')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByText('Controlled Popover')).toBeInTheDocument();
  });

  it('closes on Escape key press', () => {
    render(
      <Popover
        defaultOpen
        trigger={<button type="button">Trigger</button>}
      >
        <div>Escape Test</div>
      </Popover>,
    );

    expect(screen.getByText('Escape Test')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByText('Escape Test')).not.toBeInTheDocument();
  });

  it('forwards contentProps to PopoverContent', () => {
    render(
      <Popover
        defaultOpen
        trigger={<button type="button">Trigger</button>}
        contentProps={{ 'data-testid': 'custom-content' } as Record<string, unknown>}
      >
        <div>Content</div>
      </Popover>,
    );

    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
  });

  it('warns in dev when contentClassName is passed without a trigger', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Popover contentClassName="unused-class">
        <Popover.Trigger asChild>
          <button type="button">Custom Trigger</button>
        </Popover.Trigger>
        <Popover.Content>
          <div>Composition Content</div>
        </Popover.Content>
      </Popover>,
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('`contentClassName` was passed without a `trigger`'),
    );
    warnSpy.mockRestore();
  });
});
