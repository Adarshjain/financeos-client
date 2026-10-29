import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  Menu,
} from './Menu';

describe('Menu', () => {
  it('opens content when trigger is clicked and fires onSelect', () => {
    const handleSelect = vi.fn();
    render(
      <Menu
        trigger={<button type="button">Open menu</button>}
      >
        <Menu.Item onSelect={handleSelect}>Edit rule</Menu.Item>
        <Menu.Item>Find matches</Menu.Item>
      </Menu>,
    );

    expect(screen.queryByText('Edit rule')).not.toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.pointerDown(trigger, { button: 0 });

    expect(screen.getByText('Edit rule')).toBeInTheDocument();
    expect(screen.getByRole('menu')).toHaveClass('font-text');
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
        <Menu.Item disabled onSelect={handleSelect} hint="has transactions">
          Delete cardholder
        </Menu.Item>
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
        <Menu.Item tone="danger">Delete rule</Menu.Item>
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
        <Menu.Item active hint="Default">
          Home
        </Menu.Item>
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
        <Menu.Item action>View all dashboards</Menu.Item>
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
        <Menu.Item>One</Menu.Item>
        <Menu.Separator />
        <Menu.Item>Two</Menu.Item>
      </Menu>,
    );

    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('renders Menu.Group with uppercase label', () => {
    render(
      <Menu
        defaultOpen
        trigger={<button type="button">Trigger</button>}
      >
        <Menu.Group label="This widget">
          <Menu.Item>Widget settings</Menu.Item>
        </Menu.Group>
      </Menu>,
    );

    expect(screen.getByText('This widget')).toBeInTheDocument();
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('applies shadow-level-2, and directional slide animation', () => {
    render(
      <Menu
        defaultOpen
        trigger={<button type="button">Trigger</button>}
      >
        <div data-testid="menu-body">Content</div>
      </Menu>,
    );

    const content = screen.getByTestId('menu-body').parentElement;
    expect(content).toHaveClass('shadow-level-2', 'rounded-ds-lg');
    expect(content).toHaveClass('data-side-bottom:slide-in-from-top-1', 'data-side-top:slide-in-from-bottom-1');
  });

  it('is container-xs wide, grows to content, capped at the viewport inset, not tied to the trigger', () => {
    render(
      <Menu defaultOpen trigger={<button type="button">Trigger</button>}>
        <div data-testid="menu-width">Content</div>
      </Menu>,
    );
    const content = screen.getByTestId('menu-width').parentElement;
    expect(content).toHaveClass('w-max', 'min-w-container-xs', 'max-w-container-viewport-inset', 'desk:max-w-container-viewport-inset');
    expect(content).not.toHaveClass('min-w-menu-trigger');
  });

  it('closes on Escape key press', () => {
    render(
      <Menu
        defaultOpen
        trigger={<button type="button">Trigger</button>}
      >
        <Menu.Item>Item</Menu.Item>
      </Menu>,
    );

    expect(screen.getByText('Item')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByText('Item')).not.toBeInTheDocument();
  });

  it('opens as a menu even with more than six items', () => {
    const handleSelect = vi.fn();
    render(
      <Menu trigger={<button type="button">Phone Menu</button>}>
        <Menu.Item onSelect={handleSelect}>Item 1</Menu.Item>
        <Menu.Item>Item 2</Menu.Item>
        <Menu.Item>Item 3</Menu.Item>
        <Menu.Item>Item 4</Menu.Item>
        <Menu.Item>Item 5</Menu.Item>
        <Menu.Item>Item 6</Menu.Item>
        <Menu.Item>Item 7</Menu.Item>
      </Menu>,
    );

    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Phone Menu' }), {
      button: 0,
    });

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 7')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Item 1'));
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('forwards contentProps to MenuContent', () => {
    render(
      <Menu
        defaultOpen
        trigger={<button type="button">Trigger</button>}
        contentProps={{ 'data-testid': 'custom-menu-content' } as Record<string, unknown>}
      >
        <Menu.Item>Item</Menu.Item>
      </Menu>,
    );

    expect(screen.getByTestId('custom-menu-content')).toBeInTheDocument();
  });
});

describe('Menu.Item asChild', () => {
  it('makes the child itself the menu row (a link keeps its href)', () => {
    render(
      <Menu defaultOpen trigger={<button type="button">Open menu</button>}>
        <Menu.Item asChild>
          <a href="/somewhere">Go there</a>
        </Menu.Item>
      </Menu>,
    );
    const row = screen.getByRole('menuitem', { name: 'Go there' });
    expect(row.tagName).toBe('A');
    expect(row).toHaveAttribute('href', '/somewhere');
  });
});

describe('Menu focus return', () => {
  it('does not steal focus back when another control took it before the menu unmounted', async () => {
    const { Menu } = await import('./Menu');
    const { default: userEvent } = await import('@testing-library/user-event');
    const { render, screen, waitFor } = await import('@testing-library/react');
    const React = await import('react');
    const user = userEvent.setup();
    render(
      <>
        <Menu trigger={<button type="button">Actions</button>}>
          <Menu.Item>One</Menu.Item>
        </Menu>
        <button type="button">Other</button>
      </>,
    );
    await user.click(screen.getByText('Actions'));
    await screen.findByText('One');
    await user.keyboard('{Escape}');
    screen.getByText('Other').focus();
    await waitFor(() => expect(screen.queryByText('One')).toBeNull());
    expect(document.activeElement).toBe(screen.getByText('Other'));
    void React;
  });
});
