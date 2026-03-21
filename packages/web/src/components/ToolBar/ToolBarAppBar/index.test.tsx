import '@testing-library/jest-dom';
import { cleanup, render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

// Test just the component logic without rendering actual drawers
describe('ToolBarAppBar', () => {
    afterEach(() => {
        cleanup();
    });

    const renderWithRouter = (component: React.ReactElement) => {
        return render(<BrowserRouter>{component}</BrowserRouter>);
    };

    it('should export ToolBarAppBar', async () => {
        const { ToolBarAppBar } = await import('./index');
        expect(ToolBarAppBar).toBeDefined();
        expect(ToolBarAppBar.displayName).toBe('ToolBarAppBar');
    });

    it('shows back button on items page', async () => {
        const { ToolBarAppBar } = await import('./index');
        const { container } = renderWithRouter(
            <ToolBarAppBar isItemsPage={true} isListsPage={false} onMenuClick={() => {}} />
        );

        const buttons = container.querySelectorAll('button');
        const backButton = Array.from(buttons).find((btn) => btn.title.includes('back'));
        expect(backButton).toBeDefined();
    });

    it('shows navigation buttons on non-items non-lists page', async () => {
        const { ToolBarAppBar } = await import('./index');
        const { container } = renderWithRouter(
            <ToolBarAppBar isItemsPage={false} isListsPage={false} onMenuClick={() => {}} />
        );

        const buttons = container.querySelectorAll('button');
        const shoppingListsButton = Array.from(buttons).find((btn) => btn.title === 'Shopping lists');
        expect(shoppingListsButton).toBeDefined();
        const recipesButton = Array.from(buttons).find((btn) => btn.title === 'Recipes');
        expect(recipesButton).toBeDefined();
    });

    it('hides back button on lists page', async () => {
        const { ToolBarAppBar } = await import('./index');
        const { container } = renderWithRouter(
            <ToolBarAppBar isItemsPage={false} isListsPage={true} onMenuClick={() => {}} />
        );

        const buttons = container.querySelectorAll('button');
        const backButton = Array.from(buttons).find((btn) => btn.title.includes('back'));
        expect(backButton).toBeUndefined();
    });

    it('shows clear selected button when handler provided', async () => {
        const { ToolBarAppBar } = await import('./index');
        const { container } = renderWithRouter(
            <ToolBarAppBar isItemsPage={true} isListsPage={false} onClearSelected={() => {}} onMenuClick={() => {}} />
        );

        const buttons = container.querySelectorAll('button');
        const clearButton = Array.from(buttons).find((btn) => btn.title === 'Clear selected items');
        expect(clearButton).toBeDefined();
    });

    it('hides clear selected button when handler not provided', async () => {
        const { ToolBarAppBar } = await import('./index');
        const { container } = renderWithRouter(
            <ToolBarAppBar isItemsPage={true} isListsPage={false} onMenuClick={() => {}} />
        );

        const buttons = container.querySelectorAll('button');
        const clearButton = Array.from(buttons).find((btn) => btn.title === 'Clear selected items');
        expect(clearButton).toBeUndefined();
    });

    it('shows remove all button when handler provided', async () => {
        const { ToolBarAppBar } = await import('./index');
        const { container } = renderWithRouter(
            <ToolBarAppBar isItemsPage={true} isListsPage={false} onRemoveAll={() => {}} onMenuClick={() => {}} />
        );

        const buttons = container.querySelectorAll('button');
        const removeButton = Array.from(buttons).find((btn) => btn.title === 'Remove all items');
        expect(removeButton).toBeDefined();
    });

    it('always renders menu button', async () => {
        const { ToolBarAppBar } = await import('./index');
        const { container } = renderWithRouter(
            <ToolBarAppBar isItemsPage={false} isListsPage={true} onMenuClick={() => {}} />
        );

        const buttons = container.querySelectorAll('button');
        const menuButton = Array.from(buttons).find((btn) => btn.title === 'Menu');
        expect(menuButton).toBeDefined();
    });

    it('disables clear selected button when flag is true', async () => {
        const { ToolBarAppBar } = await import('./index');
        const { container } = renderWithRouter(
            <ToolBarAppBar
                isItemsPage={true}
                isListsPage={false}
                onClearSelected={() => {}}
                onMenuClick={() => {}}
                disableClearSelected={true}
            />
        );

        const buttons = container.querySelectorAll('button');
        const clearButton = Array.from(buttons).find(
            (btn) => btn.title === 'Clear selected items'
        ) as HTMLButtonElement;
        expect(clearButton?.disabled).toBe(true);
    });

    it('disables remove all button when flag is true', async () => {
        const { ToolBarAppBar } = await import('./index');
        const { container } = renderWithRouter(
            <ToolBarAppBar
                isItemsPage={true}
                isListsPage={false}
                onRemoveAll={() => {}}
                onMenuClick={() => {}}
                disableClearAll={true}
            />
        );

        const buttons = container.querySelectorAll('button');
        const removeButton = Array.from(buttons).find((btn) => btn.title === 'Remove all items') as HTMLButtonElement;
        expect(removeButton?.disabled).toBe(true);
    });
});
