import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Menu,
  MenuGroup,
  MenuItem,
  MenuSeparator,
} from './Menu';

describe('Menu', () => {
  it('renders menu items and triggers onSelect', () => {
    const handleSelect = vi.fn();
    render(
      <Menu>
        <MenuItem onSelect={handleSelect}>Edit rule</MenuItem>
        <MenuItem>Find matches</MenuItem>
      </Menu>,
    );
    expect(screen.getByRole('menu')).toBeInTheDocument();
    const editItem = screen.getByRole('menuitem', { name: 'Edit rule' });

    fireEvent.click(editItem);
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it('renders disabled item and prevents onSelect', () => {
    const handleSelect = vi.fn();
    render(
      <Menu>
        <MenuItem disabled onSelect={handleSelect} hint="has transactions">
          Delete cardholder
        </MenuItem>
      </Menu>,
    );
    const item = screen.getByRole('menuitem');
    expect(item).toBeDisabled();
    expect(screen.getByText('has transactions')).toBeInTheDocument();

    fireEvent.click(item);
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('renders destructive styling for delete actions', () => {
    render(
      <Menu>
        <MenuItem destructive>Delete rule</MenuItem>
      </Menu>,
    );
    const item = screen.getByRole('menuitem', { name: 'Delete rule' });
    expect(item).toHaveClass('text-danger');
  });

  it('renders active styling with hint', () => {
    render(
      <Menu>
        <MenuItem active hint="Default ✓">
          Home
        </MenuItem>
      </Menu>,
    );
    const item = screen.getByRole('menuitem');
    expect(item).toHaveClass('bg-brand-tint');
    expect(screen.getByText('Default ✓')).toHaveClass('text-brand-strong');
  });

  it('renders separator with separator role', () => {
    render(
      <Menu>
        <MenuItem>One</MenuItem>
        <MenuSeparator />
        <MenuItem>Two</MenuItem>
      </Menu>,
    );
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('renders MenuGroup with uppercase label', () => {
    render(
      <Menu>
        <MenuGroup label="This widget">
          <MenuItem>Widget settings</MenuItem>
        </MenuGroup>
      </Menu>,
    );
    expect(screen.getByText('This widget')).toBeInTheDocument();
    expect(screen.getByRole('group')).toBeInTheDocument();
  });
});

describe('DropdownMenu', () => {
  it('opens content when trigger is clicked', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button">Open menu</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Option 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.pointerDown(trigger, { button: 0 });
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  it('renders open DropdownMenu with defaultOpen', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <button type="button">Menu</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Preset 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(screen.getByText('Preset 1')).toBeInTheDocument();
  });
});
