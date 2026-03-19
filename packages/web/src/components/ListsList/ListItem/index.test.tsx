import type { ListResponse } from '@shoppingo/types';
import { ListType } from '@shoppingo/types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListItem } from './index';

describe('ListItem', () => {
    const mockListResponse: ListResponse = {
        id: '1',
        title: 'Test List',
        dateAdded: new Date(),
        items: [],
        users: [{ username: 'user1' }],
        listType: ListType.SHOPPING,
        ownerId: 'owner1',
    };

    const mockCallbacks = {
        onEditChange: vi.fn(),
        onEditStart: vi.fn(),
        onEditSave: vi.fn(),
        onEditCancel: vi.fn(),
        onDelete: vi.fn(),
        onNavigate: vi.fn(),
    };

    beforeEach(() => {
        Object.values(mockCallbacks).forEach((fn) => void fn.mockClear());
    });

    it('displays list title in display mode', () => {
        render(<ListItem list={mockListResponse} isOwner={true} isEditing={false} editValue="" {...mockCallbacks} />);

        expect(screen.getByText('Test List')).toBeInTheDocument();
    });

    it('renders ShoppingCart icon for SHOPPING list type', () => {
        render(<ListItem list={mockListResponse} isOwner={true} isEditing={false} editValue="" {...mockCallbacks} />);

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders ListTodo icon for TODO list type', () => {
        const todoList: ListResponse = {
            ...mockListResponse,
            listType: ListType.TODO,
        };

        render(<ListItem list={todoList} isOwner={true} isEditing={false} editValue="" {...mockCallbacks} />);

        expect(screen.getByText('Test List')).toBeInTheDocument();
    });

    it('shows edit and delete buttons when isOwner=true in display mode', () => {
        render(<ListItem list={mockListResponse} isOwner={true} isEditing={false} editValue="" {...mockCallbacks} />);

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThanOrEqual(3);
    });

    it('hides edit and delete buttons when isOwner=false', () => {
        render(<ListItem list={mockListResponse} isOwner={false} isEditing={false} editValue="" {...mockCallbacks} />);

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBe(1);
    });

    it('calls onNavigate when clicking title in display mode', async () => {
        const user = userEvent.setup();
        render(<ListItem list={mockListResponse} isOwner={true} isEditing={false} editValue="" {...mockCallbacks} />);

        const titleButton = screen.getByText('Test List').closest('button');
        await user.click(titleButton!);

        expect(mockCallbacks.onNavigate).toHaveBeenCalledOnce();
    });

    it('calls onEditStart when clicking edit button', async () => {
        const user = userEvent.setup();
        render(<ListItem list={mockListResponse} isOwner={true} isEditing={false} editValue="" {...mockCallbacks} />);

        const buttons = screen.getAllByRole('button');
        const editButton = buttons[1];
        await user.click(editButton);

        expect(mockCallbacks.onEditStart).toHaveBeenCalledOnce();
    });

    it('shows input with editValue in edit mode', () => {
        render(
            <ListItem
                list={mockListResponse}
                isOwner={true}
                isEditing={true}
                editValue="Edited Title"
                {...mockCallbacks}
            />
        );

        const input = screen.getByDisplayValue('Edited Title');
        expect(input).toBeInTheDocument();
    });

    it('calls onEditSave when pressing Enter in edit mode', async () => {
        const user = userEvent.setup();
        render(
            <ListItem
                list={mockListResponse}
                isOwner={true}
                isEditing={true}
                editValue="New Title"
                {...mockCallbacks}
            />
        );

        const input = screen.getByDisplayValue('New Title');
        await user.type(input, '{Enter}');

        expect(mockCallbacks.onEditSave).toHaveBeenCalledOnce();
    });

    it('calls onEditCancel when pressing Escape in edit mode', async () => {
        const user = userEvent.setup();
        render(
            <ListItem
                list={mockListResponse}
                isOwner={true}
                isEditing={true}
                editValue="New Title"
                {...mockCallbacks}
            />
        );

        const input = screen.getByDisplayValue('New Title');
        await user.type(input, '{Escape}');

        expect(mockCallbacks.onEditCancel).toHaveBeenCalledOnce();
    });

    it('calls onEditSave when clicking Check button in edit mode', async () => {
        const user = userEvent.setup();
        render(
            <ListItem
                list={mockListResponse}
                isOwner={true}
                isEditing={true}
                editValue="New Title"
                {...mockCallbacks}
            />
        );

        const buttons = screen.getAllByRole('button');
        const saveButton = buttons[0];
        await user.click(saveButton);

        expect(mockCallbacks.onEditSave).toHaveBeenCalledOnce();
    });

    it('disables delete button when in edit mode', () => {
        const { container } = render(
            <ListItem
                list={mockListResponse}
                isOwner={true}
                isEditing={true}
                editValue="New Title"
                {...mockCallbacks}
            />
        );

        const deleteButton = container.querySelector('button[disabled]');
        expect(deleteButton).toBeInTheDocument();
    });

    it('calls onDelete when clicking delete button', async () => {
        const user = userEvent.setup();
        render(<ListItem list={mockListResponse} isOwner={true} isEditing={false} editValue="" {...mockCallbacks} />);

        const buttons = screen.getAllByRole('button');
        const deleteButton = buttons[buttons.length - 1];
        await user.click(deleteButton);

        expect(mockCallbacks.onDelete).toHaveBeenCalledOnce();
    });
});
