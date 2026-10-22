import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Icon } from '../Icon/Icon';
import { TextField } from './TextField';

describe('TextField component', () => {
  it('renders label and input with default value', () => {
    render(<TextField label="Account name" defaultValue="HDFC Regalia" />);
    expect(screen.getByLabelText('Account name')).toHaveValue('HDFC Regalia');
  });

  it('renders (Optional) text when optional prop is true', () => {
    render(<TextField label="Description" optional />);
    expect(screen.getByText('(Optional)')).toBeInTheDocument();
  });

  it('handles user typing via onChange and onValueChange', () => {
    const handleChange = vi.fn();
    const handleValueChange = vi.fn();
    render(
      <TextField
        label="Pattern"
        onChange={handleChange}
        onValueChange={handleValueChange}
      />,
    );
    const input = screen.getByLabelText('Pattern');
    fireEvent.change(input, { target: { value: 'SWIGGY' } });
    expect(handleChange).toHaveBeenCalled();
    expect(handleValueChange).toHaveBeenCalledWith('SWIGGY');
    expect(input).toHaveValue('SWIGGY');
  });

  it('renders helper text when provided', () => {
    render(<TextField label="Field" helper="Helpful hint" />);
    expect(screen.getByText('Helpful hint')).toBeInTheDocument();
  });

  it('renders error message and applies danger border', () => {
    const { container } = render(
      <TextField label="Last 4 digits" error="Enter 4 digits" />,
    );
    expect(screen.getByText('Enter 4 digits')).toBeInTheDocument();
    expect(screen.getByText('Enter 4 digits')).toHaveClass('text-danger');
    const inputWrapper = container.querySelector('.border-danger');
    expect(inputWrapper).toBeInTheDocument();
  });

  it('renders disabled state', () => {
    render(<TextField label="Account" defaultValue="HDFC" disabled />);
    const input = screen.getByLabelText('Account');
    expect(input).toBeDisabled();
  });

  it('renders with prefix and tabular-nums when inputMode is decimal', () => {
    render(
      <TextField
        label="Total due"
        prefix="₹"
        inputMode="decimal"
        defaultValue="44,319.00"
      />,
    );
    expect(screen.getByText('₹')).toBeInTheDocument();
    const input = screen.getByLabelText('Total due');
    expect(input).toHaveClass('tabular-nums');
    expect(input).toHaveValue('44,319.00');
  });

  it('toggles password visibility with Show/Hide button', () => {
    render(
      <TextField
        label="Password"
        type="password"
        defaultValue="secret"
      />,
    );
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: 'Show password' });
    fireEvent.click(toggleButton);

    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });

  it('renders custom prefix and suffix elements', () => {
    render(
      <TextField
        label="Amount"
        prefix="$"
        suffix={<span data-testid="test-suffix">USD</span>}
      />,
    );
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.getByTestId('test-suffix')).toBeInTheDocument();
  });

  it('applies controlClassName to the input element', () => {
    render(<TextField label="Code" controlClassName="font-mono text-center" />);
    expect(screen.getByLabelText('Code')).toHaveClass('font-mono', 'text-center');
  });

  describe('Search form (type="search", clearable, embedded)', () => {
    it('renders with placeholder and search icon', () => {
      render(
        <TextField
          type="search"
          placeholder="Search transactions…"
          prefix={<Icon name="search" size="sm" />}
        />,
      );
      const input = screen.getByPlaceholderText('Search transactions…');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'search');
    });

    it('renders label and connects it to input', () => {
      render(<TextField type="search" label="Find the other side" />);
      const label = screen.getByText('Find the other side');
      const input = screen.getByRole('searchbox');
      expect(label).toHaveAttribute('for', input.getAttribute('id'));
    });

    it('renders helper message with aria-describedby', () => {
      render(
        <TextField
          type="search"
          defaultValue="xyz"
          helper='No transactions match "xyz".'
        />,
      );
      const helper = screen.getByText('No transactions match "xyz".');
      const input = screen.getByRole('searchbox');
      expect(helper).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-describedby', helper.getAttribute('id'));
    });

    it('shows clear button when there is text and clears on click', () => {
      const handleClear = vi.fn();
      const handleValueChange = vi.fn();

      render(
        <TextField
          type="search"
          size="md"
          clearable
          clearLabel="Clear search"
          defaultValue="swiggy"
          onClear={handleClear}
          onValueChange={handleValueChange}
        />,
      );

      const input = screen.getByRole('searchbox') as HTMLInputElement;
      expect(input.value).toBe('swiggy');

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      expect(clearButton).toBeInTheDocument();

      fireEvent.click(clearButton);
      expect(handleClear).toHaveBeenCalledTimes(1);
      expect(handleValueChange).toHaveBeenCalledTimes(1);
      expect(handleValueChange).toHaveBeenCalledWith('');
      expect(input.value).toBe('');
    });

    it('forwards callback ref and refocuses on clear', () => {
      let inputRef: HTMLInputElement | null = null;
      render(
        <TextField
          type="search"
          size="md"
          clearable
          clearLabel="Clear search"
          defaultValue="query"
          ref={(el) => {
            inputRef = el;
          }}
        />,
      );
      expect(inputRef).not.toBeNull();
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      fireEvent.click(clearButton);
      expect(document.activeElement).toBe(inputRef);
    });

    it('works in controlled mode', () => {
      const ControlledComponent = () => {
        const [val, setVal] = React.useState('initial');
        return (
          <TextField
            type="search"
            size="md"
            clearable
            clearLabel="Clear search"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onValueChange={setVal}
          />
        );
      };

      render(<ControlledComponent />);
      const input = screen.getByRole('searchbox') as HTMLInputElement;
      expect(input.value).toBe('initial');

      fireEvent.change(input, { target: { value: 'updated' } });
      expect(input.value).toBe('updated');

      const clearBtn = screen.getByRole('button', { name: /clear search/i });
      fireEvent.click(clearBtn);
      expect(input.value).toBe('');
    });

    it('applies size="md" height class (h-control-md)', () => {
      const { container } = render(
        <TextField size="md" placeholder="In filter" />,
      );
      const wrapper = container.querySelector('.h-control-md');
      expect(wrapper).toBeInTheDocument();
    });

    it('applies size="lg" height class by default', () => {
      const { container } = render(
        <TextField placeholder="In sheet" />,
      );
      const wrapper = container.querySelector('.h-control-md');
      expect(wrapper).toBeInTheDocument();
    });

    it('applies variant="embedded" classes without focus ring', () => {
      const { container } = render(<TextField variant="embedded" />);
      const box = container.querySelector('.focus-within\\:ring-0');
      expect(box).toBeInTheDocument();
    });

    it('does not show clear button when disabled', () => {
      render(
        <TextField
          type="search"
          clearable
          clearLabel="Clear search"
          defaultValue="disabled search"
          disabled
        />,
      );
      expect(
        screen.queryByRole('button', { name: /clear search/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('searchbox')).toBeDisabled();
    });

    it('applies controlClassName to search form input', () => {
      render(<TextField type="search" controlClassName="font-mono" />);
      expect(screen.getByRole('searchbox')).toHaveClass('font-mono');
    });

    it('hides webkit search cancel and decoration buttons when type is search', () => {
      const { rerender } = render(<TextField type="search" />);
      const searchbox = screen.getByRole('searchbox');
      expect(searchbox).toHaveClass('[&::-webkit-search-cancel-button]:hidden');
      expect(searchbox).toHaveClass('[&::-webkit-search-decoration]:hidden');

      rerender(<TextField />);
      const plainInput = screen.getByRole('textbox');
      expect(plainInput).not.toHaveClass('[&::-webkit-search-cancel-button]:hidden');
      expect(plainInput).not.toHaveClass('[&::-webkit-search-decoration]:hidden');
    });
  });
});

describe('TextField focus (UAT)', () => {
  it('shows only the focus ring: the border colour does not change on focus', () => {
    const { container } = render(<TextField label="Name" />);
    const box = container.querySelector('.h-control-md')!;
    expect(box).toHaveClass('border-line-strong', 'focus-within:ring-2');
    expect(box.className).not.toMatch(/focus-within:border-/);
  });

  it('keeps the danger border on error', () => {
    const { container } = render(<TextField label="Name" error="Required" />);
    expect(container.querySelector('.border-danger')).toBeInTheDocument();
  });
});

describe('TextField size xl and align', () => {
  it('xl uses control-xl height and figure text on the input', () => {
    const { container } = render(<TextField label="Amount" size="xl" />);
    expect(container.querySelector('.h-control-xl')).toBeInTheDocument();
    expect(container.querySelector('.h-control-md')).not.toBeInTheDocument();
    const input = screen.getByLabelText('Amount');
    expect(input).toHaveClass('text-figure');
    expect(input).not.toHaveClass('text-body');
  });

  it('md and lg stay control-md with body text', () => {
    for (const size of ['md', 'lg'] as const) {
      const { container, unmount } = render(<TextField label="Name" size={size} />);
      expect(container.querySelector('.h-control-md')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toHaveClass('text-body');
      unmount();
    }
  });

  it('align right end-aligns the input text, with every size and embedded', () => {
    render(
      <>
        <TextField label="A" align="right" />
        <TextField label="B" size="xl" align="right" />
        <TextField label="C" variant="embedded" align="right" />
      </>,
    );
    for (const l of ['A', 'B', 'C']) {
      expect(screen.getByLabelText(l)).toHaveClass('text-end');
    }
  });

  it('defaults to left: no text-end', () => {
    render(<TextField label="Name" />);
    expect(screen.getByLabelText('Name')).not.toHaveClass('text-end');
  });

  it('colours the value with the money-in token only when tone is success', () => {
    const { rerender } = render(<TextField label="Amount" defaultValue="10" />);
    expect(screen.getByLabelText('Amount')).not.toHaveClass('text-positive');
    expect(screen.getByLabelText('Amount')).toHaveClass('text-ink');
    rerender(<TextField label="Amount" defaultValue="10" tone="success" />);
    expect(screen.getByLabelText('Amount')).toHaveClass('text-positive');
    expect(screen.getByLabelText('Amount')).not.toHaveClass('text-ink');
  });
});
