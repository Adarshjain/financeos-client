import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PromptField } from './PromptField';

const area = () => screen.getByPlaceholderText('Ask…') as HTMLTextAreaElement;

describe('PromptField', () => {
  it('submits the trimmed text on Enter and clears when uncontrolled', () => {
    const onSubmit = vi.fn();
    render(<PromptField onSubmit={onSubmit} />);
    fireEvent.change(area(), { target: { value: '  hello  ' } });
    fireEvent.keyDown(area(), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('hello');
    expect(area()).toHaveValue('');
  });

  it('does not submit on Shift+Enter', () => {
    const onSubmit = vi.fn();
    render(<PromptField onSubmit={onSubmit} defaultValue="hi" />);
    fireEvent.keyDown(area(), { key: 'Enter', shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not submit empty or whitespace-only text', () => {
    const onSubmit = vi.fn();
    render(<PromptField onSubmit={onSubmit} defaultValue="   " />);
    fireEvent.keyDown(area(), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('ignores Enter during IME composition', () => {
    const onSubmit = vi.fn();
    render(<PromptField onSubmit={onSubmit} defaultValue="hi" />);
    fireEvent.keyDown(area(), { key: 'Enter', isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('the send button submits', () => {
    const onSubmit = vi.fn();
    render(<PromptField onSubmit={onSubmit} defaultValue="hi" />);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(onSubmit).toHaveBeenCalledWith('hi');
  });

  it('keeps the value when controlled and reports changes', () => {
    const onSubmit = vi.fn();
    const onValueChange = vi.fn();
    render(<PromptField value="hi" onValueChange={onValueChange} onSubmit={onSubmit} />);
    fireEvent.change(area(), { target: { value: 'hey' } });
    expect(onValueChange).toHaveBeenCalledWith('hey');
    fireEvent.keyDown(area(), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('hi');
    expect(area()).toHaveValue('hi');
  });

  it('shows stop while busy, calls onStop and does not submit', () => {
    const onSubmit = vi.fn();
    const onStop = vi.fn();
    render(<PromptField busy defaultValue="hi" onSubmit={onSubmit} onStop={onStop} />);
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
    fireEvent.keyDown(area(), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onStop).toHaveBeenCalled();
  });

  it('disables the field and button and does not submit when disabled', () => {
    const onSubmit = vi.fn();
    render(<PromptField disabled defaultValue="hi" onSubmit={onSubmit} />);
    expect(area()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    fireEvent.keyDown(area(), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('uses custom labels, placeholder and hint (hint hidden on phone)', () => {
    render(<PromptField sendLabel="Go" placeholder="Type" hint="Enter to send" />);
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type')).toBeInTheDocument();
    expect(screen.getByText('Enter to send')).toHaveClass('hidden', 'desk:block');
  });

  it('forwards ref to the textarea', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<PromptField ref={ref} />);
    expect(ref.current).toBe(area());
  });
});
