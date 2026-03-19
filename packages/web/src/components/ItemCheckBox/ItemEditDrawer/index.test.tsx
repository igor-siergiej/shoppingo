import { ListType } from '@shoppingo/types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ItemEditDrawer } from './index';

vi.mock('../../../components/DueDateField', () => ({
    DueDateField: ({ value, onChange }: any) => (
        <div>
            <input
                type="date"
                data-testid="due-date-field"
                value={value ? value.toISOString().split('T')[0] : ''}
                onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : undefined)}
            />
        </div>
    ),
}));

vi.mock('../../../components/QuantityUnitField', () => ({
    QuantityUnitField: ({ quantity, unit }: any) => (
        <div>
            <input type="number" data-testid="quantity-field" defaultValue={quantity} placeholder="Quantity" />
            <input type="text" data-testid="unit-field" defaultValue={unit} placeholder="Unit" />
        </div>
    ),
}));

describe('ItemEditDrawer', () => {
    const mockOnOpenChange = vi.fn();
    const mockOnEditValueChange = vi.fn();
    const mockOnQuantityChange = vi.fn();
    const mockOnUnitChange = vi.fn();
    const mockOnDueDateChange = vi.fn();
    const mockOnSave = vi.fn();
    const mockOnCancel = vi.fn();

    const defaultProps = {
        open: true,
        onOpenChange: mockOnOpenChange,
        listType: ListType.SHOPPING,
        drawerEditValue: 'Milk',
        onEditValueChange: mockOnEditValueChange,
        drawerQuantityValue: '2',
        onQuantityChange: mockOnQuantityChange,
        drawerUnitValue: 'L',
        onUnitChange: mockOnUnitChange,
        drawerDueDateValue: undefined,
        onDueDateChange: mockOnDueDateChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders edit item title', () => {
        render(<ItemEditDrawer {...defaultProps} />);

        expect(screen.getByText('Edit Item')).toBeInTheDocument();
    });

    it('renders item name input with current value', () => {
        render(<ItemEditDrawer {...defaultProps} />);

        const input = screen.getByPlaceholderText('Enter item name');
        expect(input).toHaveValue('Milk');
    });

    it('calls onEditValueChange when name input changes', async () => {
        const user = userEvent.setup();
        render(<ItemEditDrawer {...defaultProps} />);

        const input = screen.getByPlaceholderText('Enter item name');
        await user.clear(input);
        await user.type(input, 'Cheese');

        expect(mockOnEditValueChange).toHaveBeenCalled();
    });

    it('calls onSave when save button is clicked', async () => {
        const user = userEvent.setup();
        render(<ItemEditDrawer {...defaultProps} />);

        const saveButton = screen.getByRole('button', { name: /save changes/i });
        await user.click(saveButton);

        expect(mockOnSave).toHaveBeenCalled();
    });

    it('calls onCancel when cancel button is clicked', async () => {
        const user = userEvent.setup();
        render(<ItemEditDrawer {...defaultProps} />);

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await user.click(cancelButton);

        expect(mockOnCancel).toHaveBeenCalled();
    });

    it('disables save button when name is empty', () => {
        render(<ItemEditDrawer {...defaultProps} drawerEditValue="" />);

        const saveButton = screen.getByRole('button', { name: /save changes/i });
        expect(saveButton).toBeDisabled();
    });

    it('renders QuantityUnitField for shopping list type', () => {
        render(<ItemEditDrawer {...defaultProps} listType={ListType.SHOPPING} />);

        expect(screen.getByTestId('quantity-field')).toBeInTheDocument();
        expect(screen.getByTestId('unit-field')).toBeInTheDocument();
    });

    it('renders DueDateField for todo list type', () => {
        render(<ItemEditDrawer {...defaultProps} listType={ListType.TODO} />);

        expect(screen.getByTestId('due-date-field')).toBeInTheDocument();
    });

    it('does not render QuantityUnitField for todo list type', () => {
        render(<ItemEditDrawer {...defaultProps} listType={ListType.TODO} />);

        expect(screen.queryByTestId('quantity-field')).not.toBeInTheDocument();
    });

    it('does not render DueDateField for shopping list type', () => {
        render(<ItemEditDrawer {...defaultProps} listType={ListType.SHOPPING} />);

        expect(screen.queryByTestId('due-date-field')).not.toBeInTheDocument();
    });

    it('calls onSave when Enter key is pressed in name input', async () => {
        const user = userEvent.setup();
        render(<ItemEditDrawer {...defaultProps} />);

        const input = screen.getByPlaceholderText('Enter item name');
        await user.click(input);
        await user.keyboard('{Enter}');

        expect(mockOnSave).toHaveBeenCalled();
    });

    it('calls onCancel when Escape key is pressed in name input', async () => {
        const user = userEvent.setup();
        render(<ItemEditDrawer {...defaultProps} />);

        const input = screen.getByPlaceholderText('Enter item name');
        await user.click(input);
        await user.keyboard('{Escape}');

        expect(mockOnCancel).toHaveBeenCalled();
    });
});
