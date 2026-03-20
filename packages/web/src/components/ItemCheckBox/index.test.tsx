import type { Item } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ItemCheckBox from './index';

const { mockUseItemMutations, mockUseItemEditDrawer, mockUseItemImage, mockUseSwipeGesture } = vi.hoisted(() => ({
    mockUseItemMutations: vi.fn(),
    mockUseItemEditDrawer: vi.fn(),
    mockUseItemImage: vi.fn(),
    mockUseSwipeGesture: vi.fn(),
}));

vi.mock('../../hooks/useItemImage', () => ({
    useItemImage: mockUseItemImage,
}));

vi.mock('../../hooks/useSwipeGesture', () => ({
    useSwipeGesture: mockUseSwipeGesture,
}));

vi.mock('../../hooks/useItemMutations', () => ({
    useItemMutations: mockUseItemMutations,
}));

vi.mock('../../hooks/useItemEditDrawer', () => ({
    useItemEditDrawer: mockUseItemEditDrawer,
}));

vi.mock('./ItemCheckBoxCard', () => ({
    ItemCheckBoxCard: ({ item, onToggle, isSelected }: any) => (
        <button data-testid="item-card" onClick={onToggle} type="button">
            <input type="checkbox" checked={isSelected} readOnly />
            <span>{item.name}</span>
        </button>
    ),
}));

vi.mock('../../components/DueDateField', () => ({
    DueDateField: ({ value, onChange }: any) => (
        <div>
            <input
                type="date"
                value={value ? value.toISOString().split('T')[0] : ''}
                onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : undefined)}
            />
        </div>
    ),
}));

vi.mock('../../components/QuantityUnitField', () => ({
    QuantityUnitField: ({ quantity, unit }: any) => (
        <div>
            <input type="number" defaultValue={quantity} placeholder="Quantity" />
            <input type="text" defaultValue={unit} placeholder="Unit" />
        </div>
    ),
}));

describe('ItemCheckBox', () => {
    const mockItem: Item = {
        id: 'item-1',
        name: 'Milk',
        isSelected: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const defaultMutations = {
        toggleMutation: { isLoading: false, mutate: vi.fn() },
        deleteMutation: { isLoading: false, mutate: vi.fn() },
        updateNameMutation: { isLoading: false, mutate: vi.fn() },
        updateQuantityMutation: { isLoading: false, mutate: vi.fn() },
        updateDueDateMutation: { isLoading: false, mutate: vi.fn() },
    };

    const defaultDrawerState = {
        isOpen: false,
        values: { name: 'Milk', quantity: '', unit: '', dueDate: undefined },
        openDrawer: vi.fn(),
        closeDrawer: vi.fn(),
        updateName: vi.fn(),
        updateQuantity: vi.fn(),
        updateUnit: vi.fn(),
        updateDueDate: vi.fn(),
    };

    beforeEach(() => {
        mockUseItemImage.mockReturnValue({
            imageBlobUrl: null,
            hasLoadedImage: false,
            hasImageError: false,
            onImageLoad: vi.fn(),
            onImageError: vi.fn(),
        });

        mockUseSwipeGesture.mockReturnValue({
            x: 0,
            controls: {
                start: vi.fn(() => Promise.resolve()),
                subscribe: vi.fn(() => () => {}),
            },
            swipeState: 'closed',
            handleDragEnd: vi.fn(),
            closeSwipe: vi.fn(),
        });

        mockUseItemMutations.mockReturnValue(defaultMutations);
        mockUseItemEditDrawer.mockReturnValue(defaultDrawerState);

        vi.clearAllMocks();
    });

    it('renders item card', () => {
        render(<ItemCheckBox item={mockItem} listTitle="Shopping" listType={ListTypeEnum.SHOPPING} />);

        expect(screen.getByTestId('item-card')).toBeInTheDocument();
        expect(screen.getByText('Milk')).toBeInTheDocument();
    });

    it('toggles item selection when clicked', async () => {
        const user = userEvent.setup();
        const toggleMock = vi.fn();
        mockUseItemMutations.mockReturnValue({
            ...defaultMutations,
            toggleMutation: { isLoading: false, mutate: toggleMock },
        });

        render(<ItemCheckBox item={mockItem} listTitle="Shopping" listType={ListTypeEnum.SHOPPING} />);

        const card = screen.getByTestId('item-card');
        await user.click(card);

        expect(toggleMock).toHaveBeenCalled();
    });

    it('renders QuantityUnitField for shopping list type', () => {
        mockUseItemEditDrawer.mockReturnValue({
            ...defaultDrawerState,
            isOpen: true,
        });

        render(<ItemCheckBox item={mockItem} listTitle="Shopping" listType={ListTypeEnum.SHOPPING} />);

        expect(screen.getByPlaceholderText('Quantity')).toBeInTheDocument();
    });

    it('renders DueDateField for todo list type', () => {
        mockUseItemEditDrawer.mockReturnValue({
            ...defaultDrawerState,
            isOpen: true,
        });

        render(<ItemCheckBox item={mockItem} listTitle="Todo" listType={ListTypeEnum.TODO} />);

        expect(screen.getByRole('textbox', { hidden: true })).toBeInTheDocument();
    });

    it('disables save button when name is empty', () => {
        mockUseItemEditDrawer.mockReturnValue({
            ...defaultDrawerState,
            isOpen: true,
            values: { name: '', quantity: '', unit: '', dueDate: undefined },
        });

        render(<ItemCheckBox item={mockItem} listTitle="Shopping" listType={ListTypeEnum.SHOPPING} />);

        const saveButton = screen.getByRole('button', { name: /save changes/i });
        expect(saveButton).toBeDisabled();
    });
});
