import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SUGGESTIONS_NOTE_KEY, SuggestionsNote } from './SuggestionsNote';

describe('SuggestionsNote', () => {
  afterEach(() => window.localStorage.clear());

  it('shows the note until it is dismissed', async () => {
    render(<SuggestionsNote />);
    expect(await screen.findByText(/we can miss an account or get a detail wrong/)).toBeInTheDocument();
  });

  it('× hides it and remembers that in localStorage', async () => {
    render(<SuggestionsNote />);
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('suggestions-note')).toBeNull();
    expect(window.localStorage.getItem(SUGGESTIONS_NOTE_KEY)).toBe('1');
  });

  it('stays hidden once dismissed in this browser', () => {
    window.localStorage.setItem(SUGGESTIONS_NOTE_KEY, '1');
    render(<SuggestionsNote />);
    expect(screen.queryByTestId('suggestions-note')).toBeNull();
  });
});
