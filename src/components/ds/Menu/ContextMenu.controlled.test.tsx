import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { DataTable } from '../DataTable/DataTable';
import { createDataTableColumnHelper } from '../DataTable/types';
import { ContextMenu } from './ContextMenu';

const items = (onEdit = vi.fn(), onDelete = vi.fn()) => [
  { id: 'edit', label: 'Edit', onSelect: onEdit },
  { id: 'clone', label: 'Clone', onSelect: vi.fn(), disabled: true },
  { id: 'delete', label: 'Delete', tone: 'danger' as const, onSelect: onDelete },
];

describe('ContextMenu controlled (open at a point)', () => {
  it('opens at the given point in any layout, without a right-click', () => {
    render(<ContextMenu items={items()} open point={{ x: 55, y: 66 }} />);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    const anchor = document.body.querySelector('span[data-context-anchor]') as HTMLElement;
    expect(anchor.style.left).toBe('55px');
    expect(anchor.style.top).toBe('66px');
  });

  it('stays closed when open is false, or with no items', () => {
    const { rerender } = render(<ContextMenu items={items()} open={false} point={{ x: 1, y: 1 }} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    rerender(<ContextMenu items={[]} open point={{ x: 1, y: 1 }} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('asks to close when an item is chosen, and runs it', () => {
    const onEdit = vi.fn();
    const onOpenChange = vi.fn();
    render(<ContextMenu items={items(onEdit)} open point={{ x: 5, y: 5 }} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onEdit).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('a disabled item does not run', () => {
    const onClone = vi.fn();
    render(
      <ContextMenu
        items={[{ id: 'clone', label: 'Clone', onSelect: onClone, disabled: true }]}
        open
        point={{ x: 5, y: 5 }}
      />,
    );
    const item = screen.getByRole('menuitem', { name: 'Clone' });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(item);
    expect(onClone).not.toHaveBeenCalled();
  });

  it('keeps right-click working when uncontrolled and still reports open changes', () => {
    const onOpenChange = vi.fn();
    render(
      <ContextMenu items={items()} onOpenChange={onOpenChange}>
        <div data-testid="row">Row</div>
      </ContextMenu>,
    );
    window.matchMedia = vi.fn().mockImplementation(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
    fireEvent.contextMenu(screen.getByTestId('row'), { clientX: 9, clientY: 8 });
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});

interface Row { id: string; name: string }
const helper = createDataTableColumnHelper<Row>();
const columns = helper.columns([
  helper.accessor('name', { id: 'name', header: 'Name', meta: { size: 'fill', grow: 2, phone: 'main' }, cell: ({ getValue }) => getValue() }),
]);

function Page({ onRowAction }: { onRowAction: () => void }) {
  const [menu, setMenu] = React.useState<{ id: string; x: number; y: number } | null>(null);
  return (
    <>
      <DataTable
        columns={columns}
        data={[{ id: '1', name: 'Rent' }]}
        getRowId={(r) => r.id}
        onRowSelect={(row, point) => { onRowAction(); if (point) setMenu({ id: row.id, ...point }); }}
      />
      <ContextMenu
        items={items()}
        open={menu !== null}
        point={menu}
        onOpenChange={(o) => { if (!o) setMenu(null); }}
      />
    </>
  );
}

describe('DataTable row press opens a ContextMenu at the press point', () => {
  it('hands the press point to onRowSelect and the menu opens there', async () => {
    const onRowAction = vi.fn();
    render(<Page onRowAction={onRowAction} />);
    const row = screen.getAllByRole('button', { name: /Rent/ })[0];
    const user = userEvent.setup();
    await user.pointer([
      { keys: '[MouseLeft>]', target: row, coords: { clientX: 123, clientY: 77 } },
      { keys: '[/MouseLeft]', target: row, coords: { clientX: 123, clientY: 77 } },
    ]);
    expect(onRowAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    const anchor = document.body.querySelector('span[data-context-anchor]') as HTMLElement;
    expect(anchor.style.left).toBe('123px');
    expect(anchor.style.top).toBe('77px');
  });

  it('a keyboard press anchors at the row bottom-left', async () => {
    render(<Page onRowAction={vi.fn()} />);
    const row = screen.getAllByRole('button', { name: /Rent/ })[0];
    row.getBoundingClientRect = () => ({ left: 10, bottom: 90, top: 50, right: 400, width: 390, height: 40, x: 10, y: 50, toJSON: () => ({}) });
    row.focus();
    const user = userEvent.setup();
    await user.keyboard('{Enter}');
    const anchor = document.body.querySelector('span[data-context-anchor]') as HTMLElement;
    expect(anchor.style.left).toBe('10px');
    expect(anchor.style.top).toBe('90px');
  });
});
