import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';

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

  it('applies w-popover-trigger when width="match"', () => {
    render(
      <Popover
        defaultOpen
        width="match"
        trigger={<button type="button">Trigger</button>}
      >
        <div data-testid="popover-inner">Match Width</div>
      </Popover>,
    );

    const inner = screen.getByTestId('popover-inner');
    const content = inner.parentElement;
    expect(content).toHaveClass('w-popover-trigger');
    expect(content).toHaveClass('shadow-pop');
    expect(content).toHaveClass('rounded-ds-lg');
  });

  it('applies min-w-popover-trigger when width="content"', () => {
    render(
      <Popover
        defaultOpen
        width="content"
        trigger={<button type="button">Trigger</button>}
      >
        <div data-testid="popover-inner">Content Width</div>
      </Popover>,
    );

    const inner = screen.getByTestId('popover-inner');
    const content = inner.parentElement;
    expect(content).toHaveClass('min-w-popover-trigger');
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
});
