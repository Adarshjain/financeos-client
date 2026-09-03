import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoryManager } from '@/components/rules/CategoryManager';
import { api, ApiError } from '@/lib/api/client';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return {
    ...actual,
    api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() },
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const foodCat = { id: 'c1', name: 'Food' };
const groceriesCat = { id: 'c2', name: 'Groceries' };
const initialCategories = [foodCat, groceriesCat];

function mockApiGet(categoriesResponse = initialCategories) {
  (api.GET as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url === '/api/v1/categories') return Promise.resolve({ data: categoriesResponse });
    return Promise.resolve({ data: null });
  });
}

async function openCategoryMenu(user: ReturnType<typeof userEvent.setup>, categoryName: string) {
  const heading = screen.getByRole('heading', { name: categoryName });
  const card = heading.closest('div.group') as HTMLElement;
  await user.click(within(card).getByRole('button', { name: 'Category actions' }));
}

describe('CategoryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders categories fetched via useQuery', async () => {
    mockApiGet();
    renderWithQuery(<CategoryManager />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Food' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Groceries' })).toBeInTheDocument();
    });
    expect(screen.getByText('Category Manager (2)')).toBeInTheDocument();
  });

  it('filters categories by search query', async () => {
    mockApiGet();
    renderWithQuery(<CategoryManager />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Food' })).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search categories...');
    fireEvent.change(searchInput, { target: { value: 'Groc' } });

    expect(screen.queryByRole('heading', { name: 'Food' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Groceries' })).toBeInTheDocument();
  });

  it('creates a new category', async () => {
    mockApiGet();
    (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'c3', name: 'Travel' },
    });
    renderWithQuery(<CategoryManager />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Food' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Add Category/i }));
    expect(await screen.findByRole('heading', { name: 'Create New Category' })).toBeInTheDocument();

    const input = screen.getByLabelText('Category Name');
    fireEvent.change(input, { target: { value: 'Travel' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Category' }));

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/categories', {
        body: { name: 'Travel' },
      });
    });
    expect(toast.success).toHaveBeenCalledWith('Category "Travel" created!');
  });

  it('renames a category with trimmed name and shows toast', async () => {
    const user = userEvent.setup();
    mockApiGet();
    (api.PUT as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'c1', name: 'Dining Out' },
    });
    renderWithQuery(<CategoryManager />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Food' })).toBeInTheDocument();
    });

    await openCategoryMenu(user, 'Food');
    await user.click(await screen.findByRole('menuitem', { name: /Rename/i }));

    expect(await screen.findByRole('heading', { name: 'Rename Category' })).toBeInTheDocument();
    const input = screen.getByLabelText('Category name');
    expect(input).toHaveValue('Food');

    fireEvent.change(input, { target: { value: '  Dining Out  ' } });

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.PUT).toHaveBeenCalledWith('/api/v1/categories/{id}', {
        params: { path: { id: 'c1' } },
        body: { name: 'Dining Out' },
      });
    });
    expect(toast.success).toHaveBeenCalledWith('Category renamed to "Dining Out"');
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Rename Category' })).not.toBeInTheDocument();
    });
  });

  it('keeps save disabled when rename input is unchanged or whitespace', async () => {
    const user = userEvent.setup();
    mockApiGet();
    renderWithQuery(<CategoryManager />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Food' })).toBeInTheDocument();
    });

    await openCategoryMenu(user, 'Food');
    await user.click(await screen.findByRole('menuitem', { name: /Rename/i }));

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();

    const input = screen.getByLabelText('Category name');
    fireEvent.change(input, { target: { value: '   ' } });
    expect(saveButton).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Food' } });
    expect(saveButton).toBeDisabled();
  });

  it('surfaces the server error message on rename failure (e.g. duplicate name)', async () => {
    const user = userEvent.setup();
    mockApiGet();
    const apiError = new ApiError(400, {
      code: 'VALIDATION_ERROR',
      message: 'A category with this name already exists.',
      timestamp: new Date().toISOString(),
    });
    (api.PUT as ReturnType<typeof vi.fn>).mockRejectedValue(apiError);
    renderWithQuery(<CategoryManager />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Food' })).toBeInTheDocument();
    });

    await openCategoryMenu(user, 'Food');
    await user.click(await screen.findByRole('menuitem', { name: /Rename/i }));

    const input = screen.getByLabelText('Category name');
    fireEvent.change(input, { target: { value: 'Groceries' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('A category with this name already exists.');
    });
  });

  it('deletes a category after confirmation and shows toast', async () => {
    const user = userEvent.setup();
    mockApiGet();
    (api.DELETE as ReturnType<typeof vi.fn>).mockResolvedValue({ data: undefined });
    renderWithQuery(<CategoryManager />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Food' })).toBeInTheDocument();
    });

    await openCategoryMenu(user, 'Food');
    await user.click(await screen.findByRole('menuitem', { name: /Delete/i }));

    expect(await screen.findByRole('heading', { name: 'Delete Category' })).toBeInTheDocument();
    expect(
      screen.getByText('Transactions in this category will keep their other categories; none are deleted.')
    ).toBeInTheDocument();

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(api.DELETE).toHaveBeenCalledWith('/api/v1/categories/{id}', {
        params: { path: { id: 'c1' } },
      });
    });
    expect(toast.success).toHaveBeenCalledWith('Category "Food" deleted');
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Delete Category' })).not.toBeInTheDocument();
    });
  });

  it('surfaces the server error message on delete failure', async () => {
    const user = userEvent.setup();
    mockApiGet();
    const apiError = new ApiError(500, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to delete category on server',
      timestamp: new Date().toISOString(),
    });
    (api.DELETE as ReturnType<typeof vi.fn>).mockRejectedValue(apiError);
    renderWithQuery(<CategoryManager />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Food' })).toBeInTheDocument();
    });

    await openCategoryMenu(user, 'Food');
    await user.click(await screen.findByRole('menuitem', { name: /Delete/i }));

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete category on server');
    });
  });
});
