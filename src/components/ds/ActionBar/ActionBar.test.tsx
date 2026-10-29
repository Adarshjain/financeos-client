import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Button } from '../Button/Button';
import { Menu } from '../Menu/Menu';
import { ActionBar } from './ActionBar';

describe('ActionBar', () => {
  it('renders the info and the actions', () => {
    render(<ActionBar info="Stock · NSE" actions={<Button>Record trade</Button>} />);
    expect(screen.getByText('Stock · NSE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record trade' })).toBeInTheDocument();
  });

  it('opens the ⋮ menu items', async () => {
    render(
      <ActionBar
        menu={
          <>
            <Menu.Item onSelect={() => {}}>Edit</Menu.Item>
            <Menu.Item onSelect={() => {}}>Delete</Menu.Item>
          </>
        }
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'More actions' }));
    expect(await screen.findByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('has no ⋮ trigger without a menu', () => {
    render(<ActionBar info="x" actions={<Button>Go</Button>} />);
    expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
  });

  it('centres the row vertically and truncates the info', () => {
    const { container } = render(<ActionBar info="A long line" actions={<Button>Go</Button>} />);
    expect(container.firstChild).toHaveClass('items-center');
    expect(screen.getByText('A long line')).toHaveClass('truncate');
  });

  it('keeps actions at the right with no info', () => {
    const { container } = render(<ActionBar actions={<Button>Go</Button>} />);
    expect(container.firstChild).toHaveClass('justify-between');
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });
});
