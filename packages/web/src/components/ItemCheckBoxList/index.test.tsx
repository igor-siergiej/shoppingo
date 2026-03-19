import type { Item } from '@shoppingo/types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ItemCheckBoxList from './index';

// Mock ItemCheckBox component
vi.mock('../ItemCheckBox', () => ({
    default: ({ item, listTitle, listType }: any) => (
        <div data-testid={`checkbox-${item.id}`}>
            {item.name} ({listTitle} - {listType})
        </div>
    ),
}));

describe('ItemCheckBoxList', () => {
    const mockItems: Item[] = [
        { id: '1', name: 'Item 1', isSelected: false },
        { id: '2', name: 'Item 2', isSelected: true },
        { id: '3', name: 'Item 3', isSelected: false },
    ];

    it('renders all items', () => {
        render(
            <ItemCheckBoxList items={mockItems} listTitle="Shopping" listType="shopping" />
        );

        expect(screen.getByText(/Item 1/)).toBeInTheDocument();
        expect(screen.getByText(/Item 2/)).toBeInTheDocument();
        expect(screen.getByText(/Item 3/)).toBeInTheDocument();
    });

    it('sorts selected items first', () => {
        const { container } = render(
            <ItemCheckBoxList items={mockItems} listTitle="Shopping" listType="shopping" />
        );

        const items = container.querySelectorAll('[data-testid^="checkbox-"]');
        expect(items[0]).toHaveTextContent('Item 2');
        expect(items[1]).toHaveTextContent('Item 1');
        expect(items[2]).toHaveTextContent('Item 3');
    });

    it('passes listTitle and listType to ItemCheckBox', () => {
        render(
            <ItemCheckBoxList items={mockItems} listTitle="Groceries" listType="grocery" />
        );

        expect(screen.getAllByText(/Groceries.*grocery/)).toHaveLength(3);
    });

    it('handles empty items array', () => {
        const { container } = render(
            <ItemCheckBoxList items={[]} listTitle="Shopping" listType="shopping" />
        );

        expect(container.querySelectorAll('[data-testid^="checkbox-"]')).toHaveLength(0);
    });

    it('maintains original array without mutations', () => {
        const items = [...mockItems];
        const originalOrder = items.map((i) => i.id);

        render(<ItemCheckBoxList items={items} listTitle="Shopping" listType="shopping" />);

        expect(items.map((i) => i.id)).toEqual(originalOrder);
    });
});
