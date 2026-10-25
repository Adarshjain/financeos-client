import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { rawTable, widget } from '../testFixtures';
import { UpcomingView } from './UpcomingView';

const COLUMNS = [
  { key: 'dueDate', type: 'date' },
  { key: 'kind', type: 'string' },
  { key: 'title', type: 'string' },
  { key: 'amount', type: 'number' },
];

describe('UpcomingView row kind', () => {
  it('each row\'s subtitle names its kind; a row without one has none', () => {
    renderWithQuery(
      <UpcomingView
        widget={widget('upcoming')}
        onPageChange={vi.fn()}
        data={rawTable(COLUMNS, [
          { dueDate: '2026-10-15', kind: 'card_bill', title: 'Amex Platinum bill', amount: 33900 },
          { dueDate: '2026-10-20', kind: 'emi', title: 'Home loan', amount: 43391 },
          { dueDate: '2026-10-23', kind: 'lending_return', title: 'Priya Nair', amount: 12000 },
          { dueDate: '2026-10-28', kind: 'statement_expected', title: 'SBI statement expected', amount: null },
          { dueDate: '2026-10-29', kind: null, title: 'Other', amount: null },
        ])}
      />,
    );
    const rows = screen.getAllByTestId('upcoming-row');
    expect(rows[0]).toHaveTextContent('Amex Platinum billCard bill');
    expect(rows[1]).toHaveTextContent('Home loanEMI');
    expect(rows[2]).toHaveTextContent('Priya NairLending');
    expect(rows[3]).toHaveTextContent('SBI statement expectedStatement');
    expect(rows[4]).toHaveTextContent(/^\d+\w+Other(?!.*(Card bill|EMI|Lending|Statement))/);
  });
});
