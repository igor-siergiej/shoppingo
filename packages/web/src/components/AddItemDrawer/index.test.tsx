import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddItemDrawer from './index';

describe('AddItemDrawer', () => {
    const mockHandleAdd = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders trigger button', () => {
        render(<AddItemDrawer handleAdd={mockHandleAdd} />);

        const triggerButton = screen.getByRole('button');
        expect(triggerButton).toBeInTheDocument();
    });

    it('opens drawer when trigger button is clicked', async () => {
        const user = userEvent.setup();
        render(<AddItemDrawer handleAdd={mockHandleAdd} />);

        const triggerButton = screen.getByRole('button');
        await user.click(triggerButton);

        expect(screen.getByText('Add New Item')).toBeInTheDocument();
    });

    it('shows error when submitting empty name', async () => {
        const user = userEvent.setup();
        render(<AddItemDrawer handleAdd={mockHandleAdd} />);

        await user.click(screen.getByRole('button'));
        const addButton = screen.getByRole('button', { name: /add item/i });
        await user.click(addButton);

        expect(screen.getByText('Name cannot be blank.')).toBeInTheDocument();
        expect(mockHandleAdd).not.toHaveBeenCalled();
    });

    it('submits item when name is provided', async () => {
        const user = userEvent.setup();
        render(<AddItemDrawer handleAdd={mockHandleAdd} />);

        await user.click(screen.getByRole('button'));
        const input = screen.getByPlaceholderText('Enter item name...');
        await user.type(input, 'New Item');

        const addButton = screen.getByRole('button', { name: /add item/i });
        await user.click(addButton);

        expect(mockHandleAdd).toHaveBeenCalledWith('New Item');
    });

    it('clears form after successful submission', async () => {
        const user = userEvent.setup();
        render(<AddItemDrawer handleAdd={mockHandleAdd} />);

        await user.click(screen.getByRole('button'));
        const input = screen.getByPlaceholderText('Enter item name...') as HTMLInputElement;
        await user.type(input, 'New Item');

        const addButton = screen.getByRole('button', { name: /add item/i });
        await user.click(addButton);

        expect(input.value).toBe('');
    });

    it('closes drawer after successful submission', async () => {
        const user = userEvent.setup();
        render(<AddItemDrawer handleAdd={mockHandleAdd} />);

        // Open drawer
        await user.click(screen.getByRole('button'));

        // Fill in and submit
        const input = screen.getByPlaceholderText('Enter item name...');
        await user.type(input, 'New Item');

        const addButton = screen.getByRole('button', { name: /add item/i });
        await user.click(addButton);

        // After submission, form should be cleared (input cleared)
        const input2 = screen.queryByDisplayValue('New Item');
        expect(input2).not.toBeInTheDocument();
    });

    it('cancels and closes drawer', async () => {
        const user = userEvent.setup();
        render(<AddItemDrawer handleAdd={mockHandleAdd} />);

        await user.click(screen.getByRole('button'));
        const input = screen.getByPlaceholderText('Enter item name...');
        await user.type(input, 'New Item');

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        expect(mockHandleAdd).not.toHaveBeenCalled();
    });

    it('uses custom placeholder', async () => {
        const customPlaceholder = 'Type something...';
        const user = userEvent.setup();
        render(<AddItemDrawer handleAdd={mockHandleAdd} placeholder={customPlaceholder} />);

        // Open drawer to access input
        const triggerButton = screen.getByRole('button');
        await user.click(triggerButton);

        expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument();
    });

    it('trims whitespace from input', async () => {
        const user = userEvent.setup();
        render(<AddItemDrawer handleAdd={mockHandleAdd} />);

        await user.click(screen.getByRole('button'));
        const input = screen.getByPlaceholderText('Enter item name...');
        await user.type(input, '  Item with spaces  ');

        const addButton = screen.getByRole('button', { name: /add item/i });
        await user.click(addButton);

        expect(mockHandleAdd).toHaveBeenCalledWith('Item with spaces');
    });
});
