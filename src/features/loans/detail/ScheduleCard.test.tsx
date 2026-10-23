import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConcealProvider } from '@/components/ds';

import { PhoneSub } from './ScheduleCard';

const hidden = (text: string) =>
  render(
    <ConcealProvider concealed>
      <p data-testid="sub">
        <PhoneSub text={text} />
      </p>
    </ConcealProvider>,
  );

describe('PhoneSub', () => {
  it('hides both amounts', () => {
    hidden('interest 10,000 · principal 4,347');
    expect(screen.getByTestId('sub')).toHaveTextContent('interest ₹ — · principal ₹ —');
  });
  it('hides a negative amount (hyphen or minus sign)', () => {
    hidden('interest 10,000 · principal -4,347');
    expect(screen.getByTestId('sub')).toHaveTextContent('interest ₹ — · principal ₹ —');
    hidden('interest −10,000 · principal 4,347');
    expect(screen.getAllByTestId('sub')[1]).toHaveTextContent('interest ₹ — · principal ₹ —');
  });
});
