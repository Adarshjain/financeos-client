'use client';

import React from 'react';
import { createPortal } from 'react-dom';

import { isPhoneLayout } from '../phoneLayout';
import { Menu, MenuItem } from './Menu';

export interface ContextMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

export interface ContextMenuProps {
  /** The actions, in order. With none, the browser's own menu stays. */
  items: ContextMenuItem[];
  /** The row the right-click opens the menu from. Leave it out when the page drives the menu with open and point. */
  children?: React.ReactNode;
  /** Controlled: the menu is open, at `point`. Without it, a right-click on the children opens it. */
  open?: boolean;
  /** Where the controlled menu opens, in viewport coordinates (a DataTable row press hands this over). */
  point?: { x: number; y: number } | null;
  onOpenChange?: (open: boolean) => void;
}

/**
 * ContextMenu: wraps any row so that a right-click on desktop opens a small Menu at the pointer
 * with the row's actions. In the phone layout the right-click gesture does nothing (long-press stays the phone gesture).
 * Controlled (`open` + `point`), it opens at that point in either layout: a page uses it to open the menu where a
 * row was pressed (DataTable's onRowSelect hands over the press point).
 * It only shows the actions the page hands it and runs the page's handlers; it confirms nothing itself.
 *
 * Built from: Menu (Radix DropdownMenu) anchored to a zero-size point at the pointer.
 */
export function ContextMenu({
  items,
  children,
  open: controlledOpen,
  point: controlledPoint,
  onOpenChange,
}: ContextMenuProps) {
  const [ownPoint, setOwnPoint] = React.useState<{ x: number; y: number } | null>(null);
  const isControlled = controlledOpen !== undefined;
  const rawPoint = isControlled ? (controlledOpen ? (controlledPoint ?? null) : null) : ownPoint;
  const point = items.length > 0 ? rawPoint : null;
  const setPoint = (next: { x: number; y: number } | null) => {
    if (!isControlled) setOwnPoint(next);
    onOpenChange?.(next !== null);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    if (items.length === 0 || isPhoneLayout()) return;
    // The open menu is portaled, but React still bubbles its events to this wrapper: leave it be.
    if ((e.target as HTMLElement).closest('[role="menu"]')) return;
    e.preventDefault();
    // The Menu key and Shift+F10 report no pointer (0, 0): anchor at the row's bottom-left instead.
    if (e.clientX === 0 && e.clientY === 0) {
      const rect = e.currentTarget.firstElementChild?.getBoundingClientRect();
      if (rect) {
        setPoint({ x: rect.left, y: rect.bottom });
        return;
      }
    }
    setPoint({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="contents" onContextMenu={handleContextMenu}>
      {children}
      {point
        ? createPortal(
            <Menu
              open
              onOpenChange={(open) => {
                if (!open) setPoint(null);
              }}
              align="start"
              sideOffset={0}
              trigger={
                <span
                  aria-hidden
                  data-context-anchor
                  className="fixed size-0 pointer-events-none"
                  style={{ left: point.x, top: point.y }}
                />
              }
            >
              {items.map((item) => (
                <MenuItem
                  key={item.id}
                  destructive={item.tone === 'danger'}
                  disabled={item.disabled}
                  onSelect={() => item.onSelect()}
                >
                  {item.label}
                </MenuItem>
              ))}
            </Menu>,
            document.body,
          )
        : null}
    </div>
  );
}
