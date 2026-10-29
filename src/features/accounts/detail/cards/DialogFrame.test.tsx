import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DialogFrame } from './DialogFrame';

function renderFrame(pending: boolean) {
  const onSubmit = vi.fn();
  render(
    <DialogFrame title="Add holder" submitLabel="Save" onSubmit={onSubmit} onClose={vi.fn()} pending={pending} error={null}>
      <input aria-label="Name" />
    </DialogFrame>,
  );
  return onSubmit;
}

describe('DialogFrame', () => {
  it('submitting the form (Enter in a field) calls onSubmit once', () => {
    const onSubmit = renderFrame(false);
    const form = screen.getByLabelText('Name').closest('form')!;
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('form', form.id);
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not submit while a request is pending', () => {
    const onSubmit = renderFrame(true);
    fireEvent.submit(screen.getByLabelText('Name').closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
