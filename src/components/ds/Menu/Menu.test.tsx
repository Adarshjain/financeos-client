import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuSeparator,
} from './Menu';

describe('Menu', () => {
  it('opens content when trigger is clicked and fires onSelect', () => {
    const handleSelect = vi.fn();
    render(
      <Menu
        trigger={<button type="button">Open menu</button>}
      >
        <MenuItem onSelect={handleSelect}>Edit rule</MenuItem>
        <MenuItem>Find matches</MenuItem>
      </Menu>,
    );

    expect(screen.queryByText('Edit rule')).not.toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.pointerDown(trigger, { button: 0 });

    expect(screen.getByText('Edit rule')).toBeInTheDocument();
    const editItem = screen.getByRole('menuitem', { name: 'Edit rule' });

    fireEvent.click(editItem);
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it('renders disabled item and prevents onSelect', () => {
    const handleSelect = vi.fn();
    render(
      <Menu
        defaultOpen
        trigger={<button type="button">Trigger</button>}
      >
        <MenuItem disabled onSelect={handleSelect} hint="has transactions">
          Delete cardholder
        </MenuItem>
      </Menu>,
    );

    const item = screen.getByRole('menuitem');
    expect(item).toHaveAttribute('data-disabled');
    expect(item).toHaveClass('text-ink-faint', 'cursor-not-allowed');
    expect(screen.getByText('has transactions')).toBeInTheDocument();

    fireEvent.click(item);
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('renders destructive styling for delete actions', () => {
    render(
      <Menu
        defaultOpen
        trigger={<button type="button">Trigger</button>}
      >
        <MenuItem destructive>Delete rule</MenuItem>
      </Menu>,
    );

    const item = screen.getByRole('menuitem', { name: 'Delete rule' });
    expect(item).toHaveClass('text-danger');
  });

  it('renders active styling with hint', () => {
    render(
      <Menu
        defaultOpen
        trigger={<button type="button">Trigger</button>}
      >
        <MenuItem active hint="Default">
          Home
        </MenuItem>
      </Menu>,
    );

    const item = screen.getByRole('menuitem');
    expect(item).toHaveClass('bg-brand-tint', 'text-brand-strong');
    expect(screen.getByText('Default')).toHaveClass('text-brand-strong');
  });

  it('renders action link styling for switcher link', () => {
    render(
      <Menu
        defaultOpen
        trigger={<button type="button">Trigger</button>}
      >
        <MenuItem action>View all dashboards</MenuItem>
      </Menu>,
    );

    const item = screen.getByRole('menuitem', { name: 'View all dashboards' });
    expect(item).toHaveClass('text-brand', 'font-bold');
  });

  it('renders separator with separator role', () => {
    render(
      <Menu
        defaultOpen
        trigger={<button type="button">Trigger</button>}
      >
        <MenuItem>One</MenuItem>
        <MenuSeparator />
        <MenuItem>Two</MenuItem>
      </Menu>,
    );

    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('renders MenuGroup with uppercase label', () => {
    render(
      <Menu
        defaultOpen
        trigger={<button type="button">Trigger</button>}
      >
        <MenuGroup label="This widget">
          <MenuItem>Widget settings</MenuItem>
        </MenuGroup>
      </Menu>,
    );

    expect(screen.getByText('This widget')).toBeInTheDocument();
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('applies min-w-menu-trigger, shadow-pop, and rounded-ds-lg on menu content', () => {
    render(
      <Menu
        defaultOpen
        trigger={<button type="button">Trigger</button>}
      >
        <div data-testid="menu-body">Content</div>
      </Menu>,
    );

    const content = screen.getByTestId('menu-body').parentElement;
    expect(content).toHaveClass('min-w-menu-trigger', 'shadow-pop', 'rounded-ds-lg');
  });

  it('closes on Escape key press', () => {
    render(
      <Menu
        defaultOpen
        trigger={<button type="button">Trigger</button>}
      >
        <MenuItem>Item</MenuItem>
      </Menu>,
    );

    expect(screen.getByText('Item')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByText('Item')).not.toBeInTheDocument();
  });
});
