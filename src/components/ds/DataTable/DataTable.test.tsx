import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DataTable } from './DataTable';
import { createDataTableColumnHelper } from './types';

interface TestRow {
  id: string;
  name: string;
  amount: number;
  category?: string;
  date?: string;
  month?: string;
}

const testData: TestRow[] = [
  { id: '1', name: 'Alpha', amount: 100, category: 'Food', date: '10 Oct', month: 'October' },
  { id: '2', name: 'Beta', amount: 200, category: 'Food', date: '10 Oct', month: 'October' },
  { id: '3', name: 'Gamma', amount: 50, category: 'Travel', date: '11 Oct', month: 'October' },
];

const helper = createDataTableColumnHelper<TestRow>();

const testColumns = helper.columns([
  helper.accessor('name', {
    id: 'name',
    header: 'Name',
    meta: { size: 'fill', grow: 2, phone: 'main' },
    cell: ({ getValue }) => getValue(),
  }),
  helper.accessor('amount', {
    id: 'amount',
    header: 'Amount',
    meta: { size: 'sm', align: 'end', phone: 'amount', sortable: true },
    cell: ({ getValue }) => `₹${getValue()}`,
  }),
]);

const giveSize = (el: HTMLElement) => {
  el.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 400,
    bottom: 100,
    width: 400,
    height: 100,
    toJSON() {},
  });
};

const adv = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe('DataTable', () => {
  describe('Structure', () => {
    it('the header renders the column labels', () => {
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
        />,
      );
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
    });

    it('rows render cells in column order', () => {
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
        />,
      );
      const cells = screen.getAllByRole('cell');
      // 3 rows * 2 cells = 6 cells
      expect(cells[0]).toHaveTextContent('Alpha');
      expect(cells[1]).toHaveTextContent('₹100');
      expect(cells[2]).toHaveTextContent('Beta');
      expect(cells[3]).toHaveTextContent('₹200');
      expect(cells[4]).toHaveTextContent('Gamma');
      expect(cells[5]).toHaveTextContent('₹50');
    });

    it('the roots --grid-template matches the sizes: xs, fill with grow: 2, checkbox and expander first when enabled', () => {
      const { container } = render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          selectable
          renderExpanded={() => <div>Expanded content</div>}
        />,
      );
      const tableRoot = container.firstChild as HTMLElement;
      expect(tableRoot.style.getPropertyValue('--grid-template')).toBe(
        'var(--ds-control-md) var(--ds-control-md) minmax(0, 2fr) var(--ds-space-96)',
      );
    });
  });

  describe('Sorting', () => {
    it('Server: clicking a sortable number header calls onSortChange with asc, desc, then null (sortDescFirst: false)', () => {
      const handleSortChange = vi.fn();
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          sortMode="server"
          onSortChange={handleSortChange}
        />,
      );

      // Amount header is sortable; Name is not sortable
      const nameHeader = screen.getByText('Name');
      expect(nameHeader.closest('button')).toBeNull();

      const amountBtn = screen.getByRole('button', { name: /Amount/i });
      expect(amountBtn).toBeInTheDocument();

      // First click -> { id: 'amount', desc: false }
      fireEvent.click(amountBtn);
      expect(handleSortChange).toHaveBeenLastCalledWith({
        id: 'amount',
        desc: false,
      });

      // Second click -> { id: 'amount', desc: true }
      fireEvent.click(amountBtn);
      expect(handleSortChange).toHaveBeenLastCalledWith({
        id: 'amount',
        desc: true,
      });

      // Third click -> null (sorting removed)
      fireEvent.click(amountBtn);
      expect(handleSortChange).toHaveBeenLastCalledWith(null);
    });

    it('Client: the rows reorder in client sort mode', () => {
      function ClientSortedTable() {
        return (
          <DataTable
            columns={testColumns}
            data={testData}
            getRowId={(r) => r.id}
            sortMode="client"
          />
        );
      }
      render(<ClientSortedTable />);

      const amountBtn = screen.getByRole('button', { name: /Amount/i });

      // Initial order: Alpha (100), Beta (200), Gamma (50)
      let cells = screen.getAllByRole('cell');
      expect(cells[0]).toHaveTextContent('Alpha');

      // Click to sort ascending by amount (50, 100, 200)
      fireEvent.click(amountBtn);
      cells = screen.getAllByRole('cell');
      expect(cells[0]).toHaveTextContent('Gamma'); // 50
      expect(cells[2]).toHaveTextContent('Alpha'); // 100
      expect(cells[4]).toHaveTextContent('Beta'); // 200

      // Click to sort descending by amount (200, 100, 50)
      fireEvent.click(amountBtn);
      cells = screen.getAllByRole('cell');
      expect(cells[0]).toHaveTextContent('Beta'); // 200
      expect(cells[2]).toHaveTextContent('Alpha'); // 100
      expect(cells[4]).toHaveTextContent('Gamma'); // 50
    });
  });

  describe('Selection', () => {
    it('a row checkbox selects that row, and its click does not call onRowSelect', () => {
      const handleRowSelect = vi.fn();
      const handleSelectionChange = vi.fn();

      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          selectable
          onRowSelect={handleRowSelect}
          onSelectionChange={handleSelectionChange}
        />,
      );

      const checkboxes = screen.getAllByRole('checkbox');
      // checkboxes[0] is header checkbox; [1] is row 1
      fireEvent.click(checkboxes[1]);

      expect(handleSelectionChange).toHaveBeenCalledWith(['1']);
      expect(handleRowSelect).not.toHaveBeenCalled();
    });

    it('the header checkbox selects the whole page', () => {
      const handleSelectionChange = vi.fn();
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          selectable
          onSelectionChange={handleSelectionChange}
        />,
      );

      const headerCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(headerCheckbox);

      expect(handleSelectionChange).toHaveBeenCalledWith(['1', '2', '3']);
    });

    it('the mixed state shows when some rows are selected', () => {
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          selectable
          selection={['1']}
        />,
      );

      const headerCheckbox = screen.getAllByRole('checkbox')[0];
      expect(headerCheckbox).toHaveAttribute('data-state', 'indeterminate');
    });

    it('selection survives a data change: rerender with new rows, and old ids stay in state', () => {
      const handleSelectionChange = vi.fn();
      const { rerender } = render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          selectable
          selection={['1']}
          onSelectionChange={handleSelectionChange}
        />,
      );

      // Rerender with completely new page of rows
      const newPageData: TestRow[] = [
        { id: '4', name: 'Delta', amount: 400 },
        { id: '5', name: 'Epsilon', amount: 500 },
      ];

      rerender(
        <DataTable
          columns={testColumns}
          data={newPageData}
          getRowId={(r) => r.id}
          selectable
          selection={['1']}
          onSelectionChange={handleSelectionChange}
        />,
      );

      // Select a row on new page
      const rowCheckboxes = screen.getAllByRole('checkbox');
      act(() => {
        fireEvent.click(rowCheckboxes[1]); // Row '4'
      });

      // Expect both '1' and '4'
      expect(handleSelectionChange).toHaveBeenCalledWith(['1', '4']);
    });

    it('allSelected: every row shows checked. Unticking one calls onAllSelectedChange(false) and onSelectionChange(<others>)', () => {
      const handleAllSelectedChange = vi.fn();
      const handleSelectionChange = vi.fn();

      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          selectable
          allSelected
          onAllSelectedChange={handleAllSelectedChange}
          onSelectionChange={handleSelectionChange}
        />,
      );

      const checkboxes = screen.getAllByRole('checkbox');
      // Header and all rows checked
      expect(checkboxes[0]).toHaveAttribute('data-state', 'checked');
      expect(checkboxes[1]).toHaveAttribute('data-state', 'checked');
      expect(checkboxes[2]).toHaveAttribute('data-state', 'checked');
      expect(checkboxes[3]).toHaveAttribute('data-state', 'checked');

      // Untick row 2
      fireEvent.click(checkboxes[2]);

      expect(handleAllSelectedChange).toHaveBeenCalledWith(false);
      expect(handleSelectionChange).toHaveBeenCalledWith(['1', '3']);
    });
  });

  describe('Phone selection', () => {
    beforeEach(() => {
      vi.stubGlobal('jest', {
        advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
      });
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it('a touch long-press selects the row', async () => {
      const handleSelectionChange = vi.fn();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          selectable
          onSelectionChange={handleSelectionChange}
        />,
      );

      const rows = screen.getAllByRole('row');
      // rows[0] is header, rows[1] is row '1'
      const row = rows[1];
      giveSize(row);

      await user.pointer({ keys: '[TouchA>]', target: row });
      expect(handleSelectionChange).not.toHaveBeenCalled();

      adv(500);
      expect(handleSelectionChange).toHaveBeenCalledWith(['1']);

      await user.pointer({ keys: '[/TouchA]', target: row });
    });

    it('in selection mode a tap toggles', async () => {
      const handleSelectionChange = vi.fn();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          selectable
          selection={['1']}
          onSelectionChange={handleSelectionChange}
        />,
      );

      const rows = screen.getAllByRole('row');
      const row = rows[1];
      giveSize(row);

      // Quick tap under 500ms
      await user.pointer({ keys: '[TouchA>]', target: row });
      adv(100);
      await user.pointer({ keys: '[/TouchA]', target: row });

      // Since '1' was selected, tapping toggles it off
      expect(handleSelectionChange).toHaveBeenCalledWith([]);
    });

    it('the eye calls onRowSelect without toggling', () => {
      const handleRowSelect = vi.fn();
      const handleSelectionChange = vi.fn();

      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          selectable
          selection={['1']}
          onRowSelect={handleRowSelect}
          onSelectionChange={handleSelectionChange}
        />,
      );

      const eyeButtons = screen.getAllByRole('button', { name: 'Open' });
      expect(eyeButtons.length).toBeGreaterThan(0);

      fireEvent.click(eyeButtons[0]);
      expect(handleRowSelect).toHaveBeenCalledWith(testData[0]);
      expect(handleSelectionChange).not.toHaveBeenCalled();
    });
  });

  describe('Row click', () => {
    it('with onRowSelect, the click and Enter call it', () => {
      const handleRowSelect = vi.fn();
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          onRowSelect={handleRowSelect}
        />,
      );

      const rowButtons = screen.getAllByRole('button', { name: /Alpha/i });
      const row = rowButtons[0];

      fireEvent.click(row);
      expect(handleRowSelect).toHaveBeenCalledWith(testData[0]);

      fireEvent.keyDown(row, { key: 'Enter' });
      fireEvent.keyUp(row, { key: 'Enter' });
      expect(handleRowSelect).toHaveBeenCalledTimes(2);
    });

    it('without it, rows have no button role', () => {
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
        />,
      );

      // Without onRowSelect and not sortable, rows are role="row", not button
      const buttons = screen.queryAllByRole('button');
      // Only sortable headers have buttons (Amount), rows have no button role
      const rowButtons = buttons.filter((b) => b.textContent?.includes('Alpha'));
      expect(rowButtons.length).toBe(0);
    });
  });

  describe('Expandable', () => {
    it('the expander toggles renderExpanded content and calls onExpandedChange', () => {
      const handleExpandedChange = vi.fn();
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          renderExpanded={(r) => <div>Expanded for {r.name}</div>}
          onExpandedChange={handleExpandedChange}
        />,
      );

      const expandButtons = screen.getAllByRole('button', {
        name: 'Expand row',
      });
      fireEvent.click(expandButtons[0]);

      expect(handleExpandedChange).toHaveBeenCalledWith(['1']);
    });

    it('getRowCanExpand false means no expander', () => {
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          renderExpanded={(r) => <div>Expanded for {r.name}</div>}
          getRowCanExpand={(r) => r.id !== '1'}
        />,
      );

      // Row '1' has no expand button
      const expandButtons = screen.queryAllByRole('button', {
        name: 'Expand row',
      });
      // Out of 3 rows, only rows 2 and 3 get expand buttons
      expect(expandButtons.length).toBe(2);
    });

    it('with no onRowSelect, a row click toggles expansion', () => {
      const handleExpandedChange = vi.fn();
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          renderExpanded={() => <div>Expanded content</div>}
          onExpandedChange={handleExpandedChange}
        />,
      );

      const rows = screen.getAllByRole('row');
      fireEvent.click(rows[1]); // Click row '1'

      expect(handleExpandedChange).toHaveBeenCalledWith(['1']);
    });
  });

  describe('Phone layout', () => {
    it('phoneSub and phoneActions render, with desk:hidden', () => {
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          phoneSub={(r) => `Sub info ${r.id}`}
          phoneActions={() => <button type="button">Close</button>}
        />,
      );

      const subEl = screen.getByText('Sub info 1');
      expect(subEl).toBeInTheDocument();
      expect(subEl).toHaveClass('desk:hidden');

      const actionBtn = screen.getAllByText('Close')[0];
      const actionContainer = actionBtn.closest('div');
      expect(actionContainer).toHaveClass('desk:hidden');
    });

    it('leading renders in the main cell on desktop and left of the text on phone; null draws nothing', () => {
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          leading={(r) => (r.id === '1' ? <i data-testid="lead" /> : null)}
          phoneSub={(r) => `Sub info ${r.id}`}
        />,
      );

      const leads = screen.getAllByTestId('lead');
      expect(leads).toHaveLength(2);
      const desk = leads.find((el) => el.closest('[role="cell"]'));
      const phone = leads.find((el) => !el.closest('[role="cell"]'));
      expect(desk?.parentElement).toHaveClass('hidden', 'desk:block');
      expect(phone?.parentElement).toHaveClass('desk:hidden', 'row-span-2');
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveClass('grid-cols-lead-fill-auto');
      expect(rows[2]).not.toHaveClass('grid-cols-lead-fill-auto');
      expect(screen.getByText('Sub info 1')).toHaveClass('col-start-2');
      expect(screen.getByText('Sub info 2')).toHaveClass('col-start-1');
    });

    it('status cells pin right on phone and follow meta.align on desktop', () => {
      const make = (align?: 'start' | 'end') =>
        helper.columns([
          helper.accessor('name', {
            id: 'name',
            header: 'Name',
            meta: { size: 'fill', phone: 'main' },
          }),
          helper.accessor('category', {
            id: 'category',
            header: 'Category',
            meta: { size: 'sm', phone: 'status', align },
          }),
        ]);

      const { unmount } = render(
        <DataTable
          columns={make()}
          data={testData}
          getRowId={(r) => r.id}
        />,
      );
      const startCell = screen.getAllByRole('cell')[1];
      expect(startCell).toHaveClass('justify-self-end', 'justify-end');
      expect(startCell).toHaveClass(
        'desk:justify-self-start',
        'desk:justify-start',
      );
      unmount();

      render(
        <DataTable
          columns={make('end')}
          data={testData}
          getRowId={(r) => r.id}
        />,
      );
      const endCell = screen.getAllByRole('cell')[1];
      expect(endCell).toHaveClass('desk:justify-self-end', 'desk:justify-end');
      expect(endCell).not.toHaveClass('desk:justify-self-start');
    });

    it('hidden columns carry hidden desk:block', () => {
      const colsWithHidden = helper.columns([
        helper.accessor('name', {
          id: 'name',
          header: 'Name',
          meta: { size: 'fill', phone: 'main' },
        }),
        helper.accessor('category', {
          id: 'category',
          header: 'Category',
          meta: { size: 'sm', phone: 'hidden' },
        }),
      ]);

      render(
        <DataTable
          columns={colsWithHidden}
          data={testData}
          getRowId={(r) => r.id}
        />,
      );

      const categoryCell = screen.getAllByRole('cell')[1];
      expect(categoryCell).toHaveClass('hidden', 'desk:block');
    });
  });

  describe('Bands and day headers', () => {
    it('a band appears once per key change', () => {
      const dataWithBands: TestRow[] = [
        { id: '1', name: 'A', amount: 10, month: 'Oct' },
        { id: '2', name: 'B', amount: 20, month: 'Oct' },
        { id: '3', name: 'C', amount: 30, month: 'Nov' },
      ];

      render(
        <DataTable
          columns={testColumns}
          data={dataWithBands}
          getRowId={(r) => r.id}
          band={(r) => ({ key: r.month!, label: `Month: ${r.month}` })}
        />,
      );

      expect(screen.getAllByText('Month: Oct')).toHaveLength(1);
      expect(screen.getAllByText('Month: Nov')).toHaveLength(1);
    });

    it('a band renders its action', () => {
      render(
        <DataTable
          columns={testColumns}
          data={[{ id: '1', name: 'A', amount: 10, month: 'Oct' }]}
          getRowId={(r) => r.id}
          band={() => ({ key: 'k', label: 'Closed', action: <button>Show</button> })}
        />,
      );
      expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();
    });

    it('a day header appears, wrapped in desk:hidden', () => {
      const dataWithDays: TestRow[] = [
        { id: '1', name: 'A', amount: 10, date: '10 Oct' },
        { id: '2', name: 'B', amount: 20, date: '11 Oct' },
      ];

      render(
        <DataTable
          columns={testColumns}
          data={dataWithDays}
          getRowId={(r) => r.id}
          dayHeader={(r) => ({
            key: r.date!,
            label: r.date,
            sublabel: 'Mon',
          })}
        />,
      );

      const dayHeader = screen.getByText('10 Oct').closest('div');
      expect(dayHeader).toHaveClass('desk:hidden');
    });
  });

  describe('Row states', () => {
    it('warning applies bg-attention-tint, disabled applies opacity-60, highlighted applies highlighted look and calls scrollIntoView once', () => {
      const scrollMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollMock;
      window.Element.prototype.scrollIntoView = scrollMock;
      Element.prototype.scrollIntoView = scrollMock;

      const { rerender } = render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          highlightedRowId="1"
          rowState={(r) => {
            if (r.id === '2') return { tone: 'warning' };
            if (r.id === '3') return { disabled: true };
            return undefined;
          }}
        />,
      );

      const rows = screen.getAllByRole('row');
      // rows[1] is row 1 (highlighted)
      expect(rows[1]).toHaveClass('border-l-brand-strong', 'bg-brand-tint');
      expect(scrollMock).toHaveBeenCalledTimes(1);

      // rows[2] is row 2 (warning)
      expect(rows[2]).toHaveClass('bg-attention-tint');

      // rows[3] is row 3 (disabled)
      expect(rows[3]).toHaveClass('opacity-60');

      // Changing highlightedRowId calls scrollIntoView again
      rerender(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          highlightedRowId="2"
          rowState={(r) => {
            if (r.id === '2') return { tone: 'warning' };
            if (r.id === '3') return { disabled: true };
            return undefined;
          }}
        />,
      );
      expect(scrollMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pressable row state', () => {
    it('a non-pressable row has no button role and a click does not call onRowSelect; others still do', () => {
      const onRowSelect = vi.fn();
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          onRowSelect={onRowSelect}
          rowState={(r) => (r.id === '2' ? { pressable: false } : undefined)}
        />,
      );
      expect(screen.getAllByRole('button', { name: /Alpha/i })).toHaveLength(1);
      expect(screen.queryByRole('button', { name: /Beta/i })).toBeNull();
      const beta = screen.getAllByRole('row').find((r) => r.textContent?.includes('Beta'))!;
      expect(beta).not.toHaveAttribute('tabindex');
      expect(beta.className).not.toContain('cursor-pointer');
      expect(beta.className).not.toContain('opacity-60');
      expect(beta.className).not.toContain('pointer-events-none');
      fireEvent.click(beta);
      expect(onRowSelect).not.toHaveBeenCalled();
      fireEvent.click(screen.getAllByRole('button', { name: /Alpha/i })[0]);
      expect(onRowSelect).toHaveBeenCalledWith(testData[0]);
    });
  });

  describe('Muted row state', () => {
    it('dims the row but keeps it clickable', () => {
      const onRowSelect = vi.fn();
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          onRowSelect={onRowSelect}
          rowState={(r) => (r.id === '2' ? { muted: true } : undefined)}
        />,
      );
      const rows = screen.getAllByRole('button').filter((r) => r.className.includes('border-l-4'));
      const muted = rows.find((r) => r.className.includes('opacity-60'))!;
      expect(muted).toBeDefined();
      expect(muted).not.toHaveClass('pointer-events-none');
      fireEvent.click(muted);
      expect(onRowSelect).toHaveBeenCalledTimes(1);
      expect(rows.filter((r) => r.className.includes('opacity-60'))).toHaveLength(1);
    });
  });

  describe('States', () => {
    it('loading renders Skeletons and no rows', () => {
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          loading
          skeletonRows={4}
        />,
      );

      expect(screen.queryByText('Alpha')).toBeNull();
      // Skeleton lines rendered
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('empty shown with no rows', () => {
      render(
        <DataTable
          columns={testColumns}
          data={[]}
          getRowId={(r) => r.id}
          empty={<div>No records present</div>}
        />,
      );

      expect(screen.getByText('Name')).toBeInTheDocument(); // Header stays
      expect(screen.getByText('No records present')).toBeInTheDocument();
    });

    it('busy applies aria-busy', () => {
      const { container } = render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          busy
        />,
      );

      const tableRoot = container.firstChild as HTMLElement;
      expect(tableRoot).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('Other', () => {
    it('footer renders between the last row and the bottom Pager', () => {
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          footer={<div>Total: 3 records</div>}
          pager={<nav>Pager copy</nav>}
        />,
      );

      expect(screen.getByText('Total: 3 records')).toBeInTheDocument();
    });

    it('the pager renders twice', () => {
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          pager={<nav>Pagination Controls</nav>}
        />,
      );

      const pagers = screen.getAllByText('Pagination Controls');
      expect(pagers).toHaveLength(2);
    });

    it('renderRow is called with rowProps, and bands still render around it', () => {
      const renderRowMock = vi.fn((row: TestRow, props) => (
        <div data-testid={`custom-row-${row.id}`}>
          Custom: {row.name} (selected: {String(props.selected)}, selectable: {String(props.selectable)})
        </div>
      ));

      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          selectable
          band={() => ({ key: 'all', label: 'All Items' })}
          renderRow={renderRowMock}
        />,
      );

      expect(screen.getByText('All Items')).toBeInTheDocument();
      expect(screen.getByTestId('custom-row-1')).toHaveTextContent('selectable: true');
      expect(renderRowMock).toHaveBeenCalledTimes(3);
    });

    it('a rendered row scrolls into view once when highlighted, not on every render, and again on a new highlight', () => {
      const scrollMock = vi.fn();
      window.HTMLElement.prototype.scrollIntoView = scrollMock;
      const renderRow = (row: TestRow, props: { highlighted: boolean }) => (
        <div data-testid={`custom-row-${row.id}`} data-highlighted={String(props.highlighted)}>
          {row.name}
        </div>
      );
      const table = (id: string | undefined, data = testData) => (
        <DataTable columns={testColumns} data={data} getRowId={(r) => r.id} highlightedRowId={id} renderRow={renderRow} />
      );

      const { rerender } = render(table('1'));
      expect(screen.getByTestId('custom-row-1')).toHaveAttribute('data-highlighted', 'true');
      expect(scrollMock).toHaveBeenCalledTimes(1);

      rerender(table('1', [...testData]));
      expect(scrollMock).toHaveBeenCalledTimes(1);

      rerender(table('2'));
      expect(scrollMock).toHaveBeenCalledTimes(2);

      rerender(table(undefined));
      rerender(table('2'));
      expect(scrollMock).toHaveBeenCalledTimes(3);
    });

    it('wrapRow wraps each row', () => {
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          getRowId={(r) => r.id}
          wrapRow={(row, node) => (
            <div data-testid={`wrapped-${row.id}`} className="wrapper-class">
              {node}
            </div>
          )}
        />,
      );

      expect(screen.getByTestId('wrapped-1')).toBeInTheDocument();
      expect(screen.getByTestId('wrapped-2')).toBeInTheDocument();
      expect(screen.getByTestId('wrapped-3')).toBeInTheDocument();
    });
  });
});
