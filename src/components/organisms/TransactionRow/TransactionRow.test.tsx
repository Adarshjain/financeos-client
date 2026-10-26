import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DataTable, type DataTableColumnMeta } from '@/components/ds';
import { stubLayout } from '@/test/stubLayout';

import {
  transactionColumns,
  type TransactionRowData,
} from './transactionColumns';
import { TransactionRow } from './TransactionRow';

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
const adv = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('TransactionRow search highlight', () => {
  const marked = (c: HTMLElement) =>
    Array.from(c.querySelectorAll('mark')).map((m) => m.textContent);

  it('marks matches in description, account, category and amount', () => {
    const { container } = render(
      <div>
        <TransactionRow description="Adyar Anandha Bhavan" query="anandha" />
        <TransactionRow account="HDFC Bank Savings" query="hdfc" />
        <TransactionRow categories={['Food & dining']} query="food" />
        <TransactionRow amount="3,600.00" query="3600" />
      </div>,
    );
    const all = marked(container);
    expect(all).toContain('Anandha');
    expect(all).toContain('HDFC');
    expect(all).toContain('Food');
    expect(all).toContain('3,600');
  });

  it('leaves a ReactNode description alone', () => {
    const { container } = render(
      <TransactionRow description={<b>Anandha</b>} query="anandha" />,
    );
    expect(marked(container)).toHaveLength(0);
  });

  it('renders no marks without a query', () => {
    const { container } = render(
      <TransactionRow
        description="Adyar Anandha Bhavan"
        account="HDFC Bank Savings"
        amount="3,600.00"
        categories={['Food']}
      />,
    );
    expect(marked(container)).toHaveLength(0);
  });
});

describe('TransactionRow', () => {
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
  it('renders description, amount, balance, account, and provenance', () => {
    render(
      <TransactionRow
        description="BigBasket"
        amount="3,600.00"
        balance="bal ₹61,757"
        account="HDFC Bank Savings"
        provenance="Statement"
        categories={['Groceries']}
      />,
    );

    expect(screen.getByText('BigBasket')).toBeInTheDocument();
    expect(screen.getByText('.00').parentElement).toHaveTextContent('3,600.00');
    expect(screen.getAllByText('bal ₹61,757')[0]).toBeInTheDocument();
    expect(screen.getAllByText(/HDFC Bank Savings/)[0]).toBeInTheDocument();
    expect(screen.getAllByText('Statement')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Groceries')[0]).toBeInTheDocument();
  });

  it('renders credit amount with positive styling', () => {
    render(
      <TransactionRow
        description="Salary"
        amount="+2,15,000.00"
        isCredit
        categories={['Salary']}
      />,
    );

    const amountEl = screen.getByText('.00').parentElement;
    expect(amountEl).toHaveClass('text-positive');
  });

  it('renders review reason and plastic card number', () => {
    render(
      <TransactionRow
        description="Swiggy"
        amount="1,249.00"
        account="HDFC Regalia"
        plastic="••7741"
        reviewStatus="Duplicate"
        categories={['Food & dining', 'Delivery']}
      />,
    );

    expect(screen.getAllByText('HDFC Regalia ••7741')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Duplicate')[0]).toHaveClass('text-warning');
    expect(screen.getAllByText('Food & dining')[0]).toBeInTheDocument();
    expect(screen.getAllByText('+1')[0]).toBeInTheDocument();
  });

  it('on phone puts the categories in the context line, not on their own line, and keeps the amount top-right across both rows', () => {
    render(
      <TransactionRow
        description="BigBasket"
        amount="3,600.00"
        balance="₹2,95,030"
        account="HDFC Bank Savings"
        categories={['Groceries']}
      />,
    );
    const cells = screen.getAllByRole('cell');
    const description = cells.find((c) => c.textContent?.startsWith('BigBasket'));
    const categories = screen.getAllByText('Groceries')[1].closest('[role="cell"]');
    const amount = screen.getByText('.00').closest('[role="cell"]');

    expect(description).toHaveClass('col-start-1', 'row-start-1');
    expect(description).toHaveTextContent('HDFC Bank Savings');
    expect(description).toHaveTextContent('Groceries');
    expect(categories).toHaveClass('hidden', 'desk:flex');
    expect(amount).toHaveClass('col-start-2', 'row-start-1', 'row-span-2', 'self-start', 'desk:row-span-1');
  });

  it('renders unset category chip when categories array is empty and unsetCategoryLabel provided', () => {
    const handleSet = vi.fn();
    render(
      <TransactionRow
        description="Truffles"
        amount="1,860.00"
        categories={[]}
        unsetCategoryLabel="Set category"
        onSetCategory={handleSet}
      />,
    );

    const setBtn = screen.getAllByText('Set category')[0];
    expect(setBtn).toBeInTheDocument();
    fireEvent.click(setBtn);
    expect(handleSet).toHaveBeenCalledTimes(1);
  });

  it('renders selection mode with eye button', () => {
    const handleView = vi.fn();
    render(
      <TransactionRow
        description="Uber India"
        amount="640.00"
        selected
        selectionMode
        onDetail={handleView}
      />,
    );

    const eyeBtn = screen.getByRole('button', {
      name: /view transaction details/i,
    });
    expect(eyeBtn).toBeInTheDocument();
    fireEvent.click(eyeBtn);
    expect(handleView).toHaveBeenCalledTimes(1);
  });

  it('keeps the eye mounted but hidden outside selection mode, and reveals it in selection mode', () => {
    const props = { description: 'Uber India', amount: '640.00', selectable: true, onDetail: vi.fn() };
    const { rerender } = render(<TransactionRow {...props} />);
    expect(screen.queryByRole('button', { name: /view transaction details/i })).toBeNull();
    const hidden = screen.getByRole('button', { name: /view transaction details/i, hidden: true });
    expect(hidden.closest('[inert]')).not.toBeNull();
    rerender(<TransactionRow {...props} selectionMode />);
    const shown = screen.getByRole('button', { name: /view transaction details/i });
    expect(shown.closest('[inert]')).toBeNull();
    expect(shown.closest('[aria-hidden="true"]')).toBeNull();
  });

  it('keeps the eye spacing inside the Reveal, not in the grid gap, so a closed eye leaves no space', () => {
    const props = { description: 'Uber India', amount: '640.00', selectable: true, onDetail: vi.fn() };
    render(<TransactionRow {...props} />);
    const eye = screen.getByRole('button', { name: /view transaction details/i, hidden: true });
    const grid = eye.closest('.grid-cols-fill-auto-auto') as HTMLElement;
    expect(grid).not.toBeNull();
    expect(grid).toHaveClass('gap-x-0');
    expect(grid).not.toHaveClass('gap-x-space-10');
    expect(eye.parentElement).toHaveClass('pl-space-10');
  });

  it('adds no extra eye padding when a chevron keeps the grid gap', () => {
    render(<TransactionRow description="Uber India" amount="640.00" selectable onDetail={vi.fn()} chevron />);
    const eye = screen.getByRole('button', { name: /view transaction details/i, hidden: true });
    expect(eye.closest('.grid-cols-fill-auto-auto')).toHaveClass('gap-x-space-10');
    expect(eye.parentElement).not.toHaveClass('pl-space-10');
  });

  it('does not render eye button when outside selection mode even if selectable and onDetail is passed', () => {
    const handleView = vi.fn();
    render(
      <TransactionRow
        description="Swiggy"
        amount="250.00"
        selectable
        selected={false}
        selectionMode={false}
        onDetail={handleView}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'View details for Swiggy' }),
    ).not.toBeInTheDocument();
  });

  it('applies selected, tone="warning", and disabled styles', () => {
    const { container: selContainer } = render(
      <TransactionRow
        description="Selected tx"
        amount="100.00"
        selected
      />,
    );
    expect(selContainer.firstChild).toHaveClass('bg-brand-tint');

    const { container: monContainer } = render(
      <TransactionRow
        description="Monitored tx"
        amount="100.00"
        tone="warning"
      />,
    );
    expect(monContainer.firstChild).toHaveClass('bg-attention-tint');

    const { container: excContainer } = render(
      <TransactionRow
        description="Excluded tx"
        amount="100.00"
        disabled
      />,
    );
    expect(excContainer.firstChild).toHaveClass('opacity-60');
  });

  it('highlighted takes the brand-tint ground, and selected or warning win over it', () => {
    const { container, rerender } = render(<TransactionRow description="Open tx" amount="100.00" highlighted />);
    expect(container.firstChild).toHaveClass('bg-brand-tint');
    expect(container.firstChild).not.toHaveClass('bg-surface');
    rerender(<TransactionRow description="Open tx" amount="100.00" highlighted tone="warning" />);
    expect(container.firstChild).toHaveClass('bg-attention-tint');
    expect(container.firstChild).not.toHaveClass('bg-brand-tint');
    rerender(<TransactionRow description="Open tx" amount="100.00" highlighted selectable selected />);
    expect(container.firstChild).toHaveClass('bg-brand-tint');
    expect(container.firstChild).not.toHaveClass('desk:border-l-brand');
  });

  it('muted dims the row but keeps it pressable and selectable', () => {
    const onDetail = vi.fn();
    const onSelectedChange = vi.fn();
    const { container } = render(
      <TransactionRow
        description="Excluded tx"
        amount="100.00"
        muted
        selectable
        onDetail={onDetail}
        onSelectedChange={onSelectedChange}
      />,
    );
    expect(container.firstChild).toHaveClass('opacity-60');
    expect(container.firstChild).not.toHaveClass('pointer-events-none');
    fireEvent.click(screen.getByText('Excluded tx'));
    expect(onDetail).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onSelectedChange).toHaveBeenCalledWith(true);
  });

  it('triggers onClick callback when row is clicked', () => {
    const handleClick = vi.fn();
    render(
      <TransactionRow
        description="Clickable"
        amount="50.00"
        onClick={handleClick}
      />,
    );

    fireEvent.click(screen.getByText('Clickable'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders description with text-heading and without font-bold', () => {
    render(
      <TransactionRow
        description="BigBasket"
        amount="3,600.00"
      />,
    );

    const descEl = screen.getByText('BigBasket');
    expect(descEl).toHaveClass('text-heading');
    expect(descEl).not.toHaveClass('font-bold');
  });

  it('renders a 4px stripe only for warning tone rows; selected rows have none', () => {
    const { container: selContainer } = render(
      <TransactionRow
        description="Selected tx"
        amount="100.00"
        selected
      />,
    );
    expect(selContainer.querySelector('.w-space-4')).toBeNull();

    const { container: monContainer } = render(
      <TransactionRow
        description="Monitored tx"
        amount="100.00"
        tone="warning"
      />,
    );
    const monStripe = monContainer.querySelector('.bg-attention');
    expect(monStripe).toHaveClass('w-space-4');
  });

  it('calls onDetail on row tap outside selection mode, and toggles selection in selection mode on phone only', async () => {
    const handleSelectedChange = vi.fn();
    const handleDetail = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { rerender } = render(
      <TransactionRow
        description="Selectable row"
        amount="500.00"
        selectable
        selected={false}
        selectionMode={false}
        onDetail={handleDetail}
        onSelectedChange={handleSelectedChange}
      />,
    );
    const row = screen.getByRole('row');
    giveSize(row);

    await user.pointer({ keys: '[MouseLeft>]', target: row });
    await user.pointer({ keys: '[/MouseLeft]', target: row });
    expect(handleDetail).toHaveBeenCalledTimes(1);
    expect(handleSelectedChange).not.toHaveBeenCalled();

    const inSelection = (
      <TransactionRow
        description="Selectable row"
        amount="500.00"
        selectable
        selected={false}
        selectionMode={true}
        onDetail={handleDetail}
        onSelectedChange={handleSelectedChange}
      />
    );

    // Desktop layout: a press opens the detail even in selection mode, with any pointer (owner, 2026-10-18)
    stubLayout('desktop');
    rerender(inSelection);
    await user.pointer({ keys: '[MouseLeft>]', target: row });
    await user.pointer({ keys: '[/MouseLeft]', target: row });
    await user.pointer({ keys: '[TouchA>]', target: row });
    await user.pointer({ keys: '[/TouchA]', target: row });
    expect(handleDetail).toHaveBeenCalledTimes(3);
    expect(handleSelectedChange).not.toHaveBeenCalled();

    // Phone layout: a tap toggles the selection, with any pointer
    stubLayout('phone');
    rerender(inSelection);
    await user.pointer({ keys: '[MouseLeft>]', target: row });
    await user.pointer({ keys: '[/MouseLeft]', target: row });
    expect(handleSelectedChange).toHaveBeenCalledWith(true);
    expect(handleDetail).toHaveBeenCalledTimes(3);
  });

  it('a mouse long-press selects in the phone layout', async () => {
    stubLayout('phone');
    const handleSelectedChange = vi.fn();
    const handleDetail = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <TransactionRow
        description="Mouse row"
        amount="500.00"
        selectable
        selected={false}
        onDetail={handleDetail}
        onSelectedChange={handleSelectedChange}
      />,
    );
    const row = screen.getByRole('row');
    giveSize(row);

    await user.pointer({ keys: '[MouseLeft>]', target: row });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(handleSelectedChange).toHaveBeenCalledWith(true);
    await user.pointer({ keys: '[/MouseLeft]', target: row });
    expect(handleDetail).not.toHaveBeenCalled();
  });

  it('does not select on a long-press in the desktop layout, and the release still opens the detail', async () => {
    stubLayout('desktop');
    const handleSelectedChange = vi.fn();
    const handleDetail = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <TransactionRow
        description="Mouse row"
        amount="500.00"
        selectable
        selected={false}
        onDetail={handleDetail}
        onSelectedChange={handleSelectedChange}
      />,
    );
    const row = screen.getByRole('row');
    giveSize(row);

    await user.pointer({ keys: '[MouseLeft>]', target: row });
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(handleSelectedChange).not.toHaveBeenCalled();
    await user.pointer({ keys: '[/MouseLeft]', target: row });
    expect(handleSelectedChange).not.toHaveBeenCalled();
    expect(handleDetail).toHaveBeenCalledTimes(1);
  });

  it('toggles selection on Enter and Space keys in selection mode', async () => {
    const handleSelectedChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <TransactionRow
        description="Keyboard row"
        amount="500.00"
        selectable
        selected={true}
        selectionMode={true}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const row = screen.getByRole('row');
    row.focus();
    await user.keyboard('{Enter}');
    expect(handleSelectedChange).toHaveBeenCalledWith(false);

    await user.keyboard(' ');
    expect(handleSelectedChange).toHaveBeenCalledTimes(2);
  });

  it('starts selection on long-press (500ms)', async () => {
    const handleSelectedChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(
      <TransactionRow
        description="Long press row"
        amount="500.00"
        selectable
        selected={false}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const row = container.firstChild as HTMLElement;
    giveSize(row);
    await user.pointer({ keys: '[TouchA>]', target: row });

    adv(300);
    expect(handleSelectedChange).not.toHaveBeenCalled();

    adv(200);
    expect(handleSelectedChange).toHaveBeenCalledWith(true);

    await user.pointer({ keys: '[/TouchA]', target: row });
    expect(handleSelectedChange).toHaveBeenCalledTimes(1);
  });

  it('cancels long-press when movement exceeds 10px', async () => {
    const handleSelectedChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(
      <TransactionRow
        description="Moving row"
        amount="500.00"
        selectable
        selected={false}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const row = container.firstChild as HTMLElement;
    giveSize(row);
    await user.pointer({ keys: '[TouchA>]', target: row, coords: { clientX: 100, clientY: 100 } });
    await user.pointer({ target: row, coords: { clientX: 100, clientY: 120 } });
    adv(600);
    await user.pointer({ keys: '[/TouchA]', target: row, coords: { clientX: 100, clientY: 120 } });

    expect(handleSelectedChange).not.toHaveBeenCalled();
  });

  it('a tap on a selectable row outside selection mode calls onDetail and does not select', async () => {
    const handleDetail = vi.fn();
    const handleSelectedChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <TransactionRow
        description="Tap detail row"
        amount="500.00"
        selectable
        selected={false}
        onDetail={handleDetail}
        onSelectedChange={handleSelectedChange}
      />,
    );
    const row = screen.getByRole('row');
    giveSize(row);
    await user.pointer({ keys: '[MouseLeft>]', target: row });
    await user.pointer({ keys: '[/MouseLeft]', target: row });

    expect(handleDetail).toHaveBeenCalledTimes(1);
    expect(handleSelectedChange).not.toHaveBeenCalled();
  });

  it('a tap on a category chip calls its handler and does not open or select the row', async () => {
    const handleCategoryClick = vi.fn();
    const handleDetail = vi.fn();
    const handleSelectedChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <TransactionRow
        description="Category row"
        amount="500.00"
        selectable
        selected={false}
        categories={['Dining']}
        onCategoryClick={handleCategoryClick}
        onDetail={handleDetail}
        onSelectedChange={handleSelectedChange}
      />,
    );
    const chip = screen.getAllByText('Dining')[0];
    giveSize(chip);
    await user.click(chip);

    expect(handleCategoryClick).toHaveBeenCalledWith('Dining');
    expect(handleDetail).not.toHaveBeenCalled();
    expect(handleSelectedChange).not.toHaveBeenCalled();
  });

  it('eye control opens detail without toggling selection', () => {
    const handleDetail = vi.fn();
    const handleSelectedChange = vi.fn();
    render(
      <TransactionRow
        description="Detail row"
        amount="500.00"
        selected
        selectionMode
        onDetail={handleDetail}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const eyeBtn = screen.getByRole('button', {
      name: /view transaction details/i,
    });
    fireEvent.click(eyeBtn);

    expect(handleDetail).toHaveBeenCalledTimes(1);
    expect(handleSelectedChange).not.toHaveBeenCalled();
  });

  it('renders desktop checkbox when selectable on desktop', () => {
    const handleSelectedChange = vi.fn();
    render(
      <TransactionRow
        description="Desktop selectable"
        amount="500.00"
        selectable
        selected={false}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const checkbox = screen.getByLabelText('Select Desktop selectable');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(handleSelectedChange).toHaveBeenCalledWith(true);
  });

  it('renders leading element and trailing chevron', () => {
    const { container } = render(
      <TransactionRow
        leading={<span data-testid="leading-avatar">HD</span>}
        description="Amex bill"
        amount="10,000.00"
        chevron
      />,
    );

    expect(screen.getByTestId('leading-avatar')).toBeInTheDocument();
    const chevronSvg = container.querySelector('svg.w-icon-sm');
    expect(chevronSvg).toBeInTheDocument();
  });

  it('supports uncontrolled selection via defaultSelected', () => {
    const handleSelectedChange = vi.fn();
    render(
      <TransactionRow
        description="Uncontrolled row"
        amount="500.00"
        selectable
        defaultSelected={true}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const checkbox = screen.getByLabelText('Select Uncontrolled row');
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(handleSelectedChange).toHaveBeenCalledWith(false);
  });

  describe('DataTable integration and Desktop cells', () => {
    it('Desktop cells render in grid order', () => {
      render(
        <TransactionRow
          date="15 Oct"
          description="Apple Store"
          amount="1,19,900.00"
          balance="bal ₹42,100"
          account="HDFC Regalia"
          plastic="••7741"
          categories={['Electronics']}
          selectable
          selected
        />,
      );

      const cells = screen.getAllByRole('cell');
      // Verify cells appear in grid order:
      // 1. checkbox, 2. date, 3. description, 4. categories, 5. account, 6. amount, 7. balance
      expect(cells).toHaveLength(7);
      expect(cells[0]).toHaveClass('hidden desk:flex');
      expect(cells[1]).toHaveTextContent('15 Oct');
      expect(cells[2]).toHaveTextContent('Apple Store');
      expect(cells[3]).toHaveTextContent('Electronics');
      expect(cells[4]).toHaveTextContent('HDFC Regalia ••7741');
      expect(cells[5]).toHaveTextContent('1,19,900.00');
      expect(cells[6]).toHaveTextContent('bal ₹42,100');
    });

    it('date prop shows on desktop, hidden on phone', () => {
      render(
        <TransactionRow
          date="15 Oct"
          description="Swiggy"
          amount="1,249.00"
        />,
      );

      const dateEl = screen.getByText('15 Oct');
      expect(dateEl).toHaveClass('hidden desk:block');
    });

    it('transactionColumns matches the column tracks', () => {
      expect(transactionColumns).toHaveLength(6);

      const [dateCol, descCol, catCol, accCol, amtCol, balCol] =
        transactionColumns;

      const dateMeta = dateCol.meta as DataTableColumnMeta | undefined;
      expect(dateCol.id).toBe('date');
      expect(dateMeta?.size).toBe('sm');
      expect(dateMeta?.sortable).toBe(true);

      const descMeta = descCol.meta as DataTableColumnMeta | undefined;
      expect(descCol.id).toBe('description');
      expect(descMeta?.size).toBe('fill');
      expect(descMeta?.sortable).toBe(true);
      expect(descMeta?.phone).toBe('main');

      const catMeta = catCol.meta as DataTableColumnMeta | undefined;
      expect(catCol.id).toBe('category');
      expect(catMeta?.size).toBe('md');

      const accMeta = accCol.meta as DataTableColumnMeta | undefined;
      expect(accCol.id).toBe('account');
      expect(accMeta?.size).toBe('sm');

      const amtMeta = amtCol.meta as DataTableColumnMeta | undefined;
      expect(amtCol.id).toBe('amount');
      expect(amtMeta?.size).toBe('sm');
      expect(amtMeta?.align).toBe('end');
      expect(amtMeta?.sortable).toBe(true);
      expect(amtMeta?.phone).toBe('amount');

      const balMeta = balCol.meta as DataTableColumnMeta | undefined;
      expect(balCol.id).toBe('balance');
      expect(balMeta?.size).toBe('sm');
      expect(balMeta?.align).toBe('end');
    });

    it('Selection in DataTable with TransactionRow updates TanStack state and fires onSelectionChange', () => {
      const handleSelectionChange = vi.fn();
      const testData: TransactionRowData[] = [
        {
          id: 'tx-1',
          date: '15 Oct',
          description: 'Apple Store',
          amount: 119900,
          formattedAmount: '₹1,19,900.00',
        },
        {
          id: 'tx-2',
          date: '14 Oct',
          description: 'Starbucks',
          amount: 750,
          formattedAmount: '₹750.00',
        },
      ];

      render(
        <DataTable
          columns={transactionColumns}
          data={testData}
          getRowId={(r) => r.id}
          selectable
          onSelectionChange={handleSelectionChange}
          renderRow={(row, rowProps) => (
            <TransactionRow
              key={row.id}
              date={row.date}
              description={row.description}
              amount={row.formattedAmount}
              selectable={rowProps.selectable}
              selected={rowProps.selected}
              onSelectedChange={rowProps.onSelectedChange}
            />
          )}
        />,
      );

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);
      expect(handleSelectionChange).toHaveBeenCalledWith(['tx-1']);

      fireEvent.click(checkboxes[0]);
      expect(handleSelectionChange).toHaveBeenCalledWith(['tx-1', 'tx-2']);
    });
  });
});

describe('TransactionRow amount fraction', () => {
  it('renders the paise in a smaller muted span, the integer part untouched', () => {
    render(<TransactionRow description="BigBasket" amount="3,600.50" />);
    const frac = screen.getByText('.50');
    expect(frac).toHaveClass('text-label', 'text-ink-3');
    expect(frac).not.toHaveClass('text-heading');
    expect(frac.parentElement?.textContent).toContain('3,600.50');
  });

  it('keeps a credit fraction in the credit tone (not muted)', () => {
    render(<TransactionRow description="Salary" amount="+50,000.00" isCredit />);
    expect(screen.getByText('.00')).not.toHaveClass('text-ink-3');
  });

  it('leaves a whole amount alone', () => {
    const { container } = render(<TransactionRow description="Rent" amount="3,600" />);
    expect(container.querySelector('.desk\\:text-label')).toBeNull();
  });
});

describe('TransactionRow account logo', () => {
  it('draws the logo before the account name on phone and desktop', () => {
    const { container } = render(<TransactionRow description="Rent" account="HDFC Savings" accountLogo={<i data-testid="logo" />} />);
    expect(screen.getAllByTestId('logo')).toHaveLength(2);
    const html = container.innerHTML;
    const first = html.indexOf('data-testid="logo"');
    const second = html.indexOf('data-testid="logo"', first + 1);
    expect(first).toBeLessThan(html.indexOf('HDFC Savings'));
    expect(second).toBeLessThan(html.indexOf('HDFC Savings', html.indexOf('HDFC Savings') + 1));
    expect(second).toBeGreaterThan(html.indexOf('HDFC Savings'));
  });

  it('adds no logo and no gap without one', () => {
    const { container } = render(<TransactionRow description="Rent" account="Cash" />);
    expect(screen.queryByTestId('logo')).toBeNull();
    expect(container.querySelector('.gap-space-4.inline-flex')).toBeNull();
    expect(container.querySelector('.mr-space-4')).toBeNull();
  });
});
