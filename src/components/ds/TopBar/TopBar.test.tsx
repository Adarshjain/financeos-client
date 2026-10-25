import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TopBar, type TopBarAction } from './TopBar';

describe('TopBar component', () => {
  it('renders title and crumb correctly', () => {
    render(<TopBar crumb="Settings" title="Profile" />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders custom leading slot on phone', () => {
    render(
      <TopBar
        title="Home"
        leading={<span data-testid="custom-leading">LogoMark</span>}
      />,
    );
    expect(screen.getByTestId('custom-leading')).toBeInTheDocument();
  });

  it('renders back button when onBack prop is provided', () => {
    const handleBack = vi.fn();
    render(
      <TopBar
        crumb="Accounts"
        title="HDFC Regalia Gold"
        onBack={handleBack}
      />,
    );
    const backBtn = screen.getByRole('button', { name: 'Back' });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('renders back as anchor link when backHref is provided', () => {
    render(
      <TopBar
        title="Details"
        backHref="/dashboard"
      />,
    );
    const backLink = screen.getByRole('link', { name: 'Back' });
    expect(backLink).toHaveAttribute('href', '/dashboard');
  });

  it('renders actions passed through props and handles callbacks', () => {
    const handleAdd = vi.fn();
    const handleChat = vi.fn();

    const actions: TopBarAction[] = [
      { id: 'add', icon: 'add', label: 'Add', variant: 'primary', onSelect: handleAdd },
      { id: 'chat', icon: 'chat', label: 'Chat', onSelect: handleChat },
    ];

    render(
      <TopBar
        title="Dashboard"
        actions={actions}
      />,
    );

    const addBtn = screen.getByRole('button', { name: 'Add' });
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);

    const chatBtn = screen.getByRole('button', { name: 'Chat' });
    expect(chatBtn).toBeInTheDocument();
    fireEvent.click(chatBtn);
    expect(handleChat).toHaveBeenCalledTimes(1);
  });

  it('supports asChild rendering on actions', () => {
    const handleSelect = vi.fn();
    const actions: TopBarAction[] = [
      {
        id: 'link-action',
        icon: 'search',
        label: 'Search Link',
        onSelect: handleSelect,
        asChild: true,
        children: <a href="/search">Search Link</a>,
      },
    ];

    render(
      <TopBar
        title="Dashboard"
        actions={actions}
      />,
    );

    const actionLink = screen.getByRole('link', { name: 'Search Link' });
    expect(actionLink).toBeInTheDocument();
    expect(actionLink).toHaveAttribute('href', '/search');
    fireEvent.click(actionLink);
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });
});

describe('TopBar action icon size', () => {
  it('uses labelIconSize beside the desktop label and md for the phone icon-only form', () => {
    const { container } = render(
      <TopBar title="Accounts" actions={[{ id: 'add', icon: 'add', label: 'Add', showLabel: true, labelIconSize: 'xs' }]} />
    );
    const icons = container.querySelectorAll('button svg');
    expect(icons).toHaveLength(2);
    expect(icons[0].getAttribute('class')).toContain('desk:hidden');
    expect(icons[1].getAttribute('class')).toContain('hidden desk:inline-block');
    expect(icons[0].getAttribute('class')).toContain('w-icon-md');
    expect(icons[1].getAttribute('class')).toContain('w-icon-xs');
  });

  it('draws one md icon when no labelIconSize is given', () => {
    const { container } = render(<TopBar title="Accounts" actions={[{ id: 'add', icon: 'add', label: 'Add', showLabel: true }]} />);
    const icons = container.querySelectorAll('button svg');
    expect(icons).toHaveLength(1);
    expect(icons[0].getAttribute('class')).toContain('w-icon-md');
  });
});

describe('TopBar back control (UAT)', () => {
  it('shows the back link at every width when backHref is set', () => {
    render(<TopBar title="HDFC Regalia Gold" backHref="/accounts" />);
    const back = screen.getByRole('link', { name: 'Back' });
    expect(back).toHaveAttribute('href', '/accounts');
    expect(back.parentElement).not.toHaveClass('desk:hidden');
  });

  it('shows the onBack button at every width', () => {
    render(<TopBar title="Detail" onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Back' }).parentElement).not.toHaveClass('desk:hidden');
  });

  it('keeps a custom leading slot phone only', () => {
    render(<TopBar title="Home" leading={<span data-testid="lead">x</span>} />);
    expect(screen.getByTestId('lead').parentElement).toHaveClass('desk:hidden');
  });
});

describe('TopBar dot and popover actions', () => {
  it('passes dot to the button', () => {
    render(<TopBar title="Home" actions={[{ id: 'n', icon: 'notifications', label: 'Notifications', dot: true }]} />);
    expect(screen.getByTestId('button-dot')).toBeInTheDocument();
  });

  it('draws no dot when dot is not set', () => {
    render(<TopBar title="Home" actions={[{ id: 'n', icon: 'notifications', label: 'Notifications' }]} />);
    expect(screen.queryByTestId('button-dot')).not.toBeInTheDocument();
  });

  it('opens the popover on click and reports open and close', async () => {
    const onOpenChange = vi.fn();
    render(
      <TopBar
        title="Home"
        actions={[
          {
            id: 'n',
            icon: 'notifications',
            label: 'Notifications',
            popover: { content: <div>Bill due tomorrow</div>, onOpenChange },
          },
        ]}
      />,
    );
    expect(screen.queryByText('Bill due tomorrow')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(await screen.findByText('Bill due tomorrow')).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    fireEvent.keyDown(screen.getByText('Bill due tomorrow'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Bill due tomorrow')).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('leaves actions without a popover unchanged', () => {
    const onSelect = vi.fn();
    render(<TopBar title="Home" actions={[{ id: 's', icon: 'search', label: 'Search', onSelect }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('TopBar menu actions', () => {
  const open = () => fireEvent.pointerDown(screen.getByRole('button', { name: 'Add' }), { button: 0 });

  it('opens a menu of the rows from the button', () => {
    render(
      <TopBar
        title="Home"
        actions={[{ id: 'add', icon: 'add', label: 'Add', menu: [{ id: 'a', label: 'Record trade' }, { id: 'b', label: 'Import tradebook' }] }]}
      />,
    );
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    open();
    expect(screen.getByRole('menuitem', { name: 'Record trade' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Import tradebook' })).toBeInTheDocument();
  });

  it('calls onSelect for a button row', () => {
    const onSelect = vi.fn();
    render(<TopBar title="Home" actions={[{ id: 'add', icon: 'add', label: 'Add', menu: [{ id: 'a', label: 'Record trade', onSelect }] }]} />);
    open();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Record trade' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('renders a link row with its href', () => {
    render(<TopBar title="Home" actions={[{ id: 'add', icon: 'add', label: 'Add', menu: [{ id: 'b', label: 'Import tradebook', asChild: true, children: <a href="/import" /> }] }]} />);
    open();
    expect(screen.getByRole('menuitem', { name: 'Import tradebook' })).toHaveAttribute('href', '/import');
  });
});

describe('TopBar title node and back click', () => {
  it('renders a string title with the title type and truncation', () => {
    render(<TopBar title="Accounts" />);
    expect(screen.getByText('Accounts')).toHaveClass('text-title', 'truncate');
  });

  it('renders controls as the title: not a heading, centred, shrinkable', () => {
    render(
      <TopBar
        title={
          <>
            <button type="button">Dashboard switcher</button>
            <button type="button" aria-label="More">⋯</button>
          </>
        }
      />,
    );
    const switcher = screen.getByRole('button', { name: 'Dashboard switcher' });
    expect(screen.queryByRole('heading')).toBeNull();
    const wrap = switcher.parentElement as HTMLElement;
    expect(wrap).toHaveClass('flex', 'items-center', 'min-w-0');
    expect(wrap).not.toHaveClass('truncate');
    expect(wrap.parentElement).toHaveClass('flex-1', 'min-w-0');
  });

  it('calls onBack on a plain click of the back link and keeps its href', () => {
    const onBack = vi.fn();
    render(<TopBar title="Detail" backHref="/accounts" onBack={onBack} />);
    const back = screen.getByRole('link', { name: 'Back' });
    expect(back).toHaveAttribute('href', '/accounts');
    const notPrevented = fireEvent.click(back);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(notPrevented).toBe(false);
  });

  it('leaves modified clicks to the browser', () => {
    const onBack = vi.fn();
    render(<TopBar title="Detail" backHref="/accounts" onBack={onBack} />);
    fireEvent.click(screen.getByRole('link', { name: 'Back' }), { metaKey: true });
    fireEvent.click(screen.getByRole('link', { name: 'Back' }), { button: 1 });
    expect(onBack).not.toHaveBeenCalled();
  });
});
