import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FollowUpChips } from '../FollowUpChips';

describe('FollowUpChips', () => {
  it('renders question chips and triggers onSelect when clicked', () => {
    const onSelect = vi.fn();
    const questions = [
      'How does this compare to last month?',
      'Which card did I use most for dining?',
    ];

    render(<FollowUpChips questions={questions} onSelect={onSelect} />);

    expect(
      screen.getByText('How does this compare to last month?'),
    ).toBeInTheDocument();
    const chip2 = screen.getByText('Which card did I use most for dining?');
    expect(chip2).toBeInTheDocument();

    fireEvent.click(chip2);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      'Which card did I use most for dining?',
    );
  });

  it('renders null when questions array is empty', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <FollowUpChips questions={[]} onSelect={onSelect} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
