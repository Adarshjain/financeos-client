import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import {
  ChatChartBlock,
  ChatChartCard,
} from '../ChatChartCard';

describe('ChatChartCard', () => {
  it('mounts ChartView without crashing for a pie chart block', () => {
    const pieChart: ChatChartBlock = {
      chartType: 'pie',
      title: 'Spend by Category',
      categories: ['Dining', 'Travel', 'Groceries'],
      series: [
        {
          name: 'Spend',
          data: [12000, 8000, 5000],
        },
      ],
    };

    render(<ChatChartCard chart={pieChart} />);

    expect(screen.getByText('Spend by Category')).toBeInTheDocument();
    // ChartDataTable screen-reader table is rendered
    expect(screen.getByText('Dining')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('mounts ChartView without crashing for a bar chart block', () => {
    const barChart: ChatChartBlock = {
      chartType: 'bar',
      title: 'Monthly Inflow vs Outflow',
      categories: ['Jan', 'Feb', 'Mar'],
      series: [
        { name: 'Inflow', data: [50000, 55000, 60000] },
        { name: 'Outflow', data: [35000, 42000, 38000] },
      ],
    };

    render(<ChatChartCard chart={barChart} />);

    expect(screen.getByText('Monthly Inflow vs Outflow')).toBeInTheDocument();
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Feb')).toBeInTheDocument();
    expect(screen.getByText('Mar')).toBeInTheDocument();
  });

  it('renders null when categories or series are empty', () => {
    const { container } = render(
      <ChatChartCard
        chart={{
          chartType: 'bar',
          categories: [],
          series: [],
        }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
