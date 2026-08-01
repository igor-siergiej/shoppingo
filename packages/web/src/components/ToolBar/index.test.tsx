import { ListType } from '@shoppingo/types';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ToolBar from './index';

const { mockLogout, mockNavigate, mockUseToolBarState, mockHandleGoBack, mockUseLocation } = vi.hoisted(() => ({
    mockLogout: vi.fn(),
    mockNavigate: vi.fn(),
    mockHandleGoBack: vi.fn(),
    mockUseToolBarState: vi.fn(),
    mockUseLocation: vi.fn(() => ({ pathname: '/lists' })),
}));

vi.mock('@imapps/web-utils', () => ({
    useAuth: () => ({
        logout: mockLogout,
    }),
    useUser: () => ({
        user: { id: 'user-1' },
    }),
}));

vi.mock('react-router-dom', () => ({
    useLocation: mockUseLocation,
    useNavigate: () => mockNavigate,
}));

vi.mock('react-use-measure', () => ({
    default: () => [{ current: null }, { height: 100, width: 200 }],
}));

vi.mock('../../hooks/useToolBarState', () => ({
    useToolBarState: mockUseToolBarState,
}));

vi.mock('./HamburgerMenu', () => ({
    HamburgerMenu: () => <div data-testid="hamburger-menu">Menu</div>,
}));

vi.mock('./ToolBarAppBar', () => ({
    ToolBarAppBar: ({ onMenuClick, itemDrawer, listDrawer, actionsFab }: any) => (
        <div data-testid="toolbar-appbar">
            <button type="button" onClick={onMenuClick}>
                Menu
            </button>
            {itemDrawer}
            {listDrawer}
            {actionsFab}
        </div>
    ),
}));

vi.mock('../ManageUsersDrawer', () => ({
    ManageUsersDrawer: () => <div data-testid="manage-users-drawer">Users</div>,
}));

vi.mock('../ManageLabelsDrawer', () => ({
    ManageLabelsDrawer: () => <div data-testid="manage-labels-drawer">Labels</div>,
}));

vi.mock('./ActionsFab', () => ({
    ActionsFab: ({ actionItems }: { actionItems: { show: boolean; label: string }[] }) => (
        <div data-testid="actions-fab">
            {actionItems
                .filter((item) => item.show)
                .map((item) => (
                    <span key={item.label}>{item.label}</span>
                ))}
        </div>
    ),
}));

vi.mock('./AddFromRecipeDrawer', () => ({
    AddFromRecipeDrawer: () => <div data-testid="add-from-recipe-drawer" />,
}));

describe('ToolBar', () => {
    beforeEach(() => {
        mockUseLocation.mockReturnValue({ pathname: '/lists' });
        mockUseToolBarState.mockReturnValue({
            isManageUsersOpen: false,
            setIsManageUsersOpen: vi.fn(),
            isAddItemDrawerOpen: false,
            setIsAddItemDrawerOpen: vi.fn(),
            isAddListDrawerOpen: false,
            setIsAddListDrawerOpen: vi.fn(),
            menuCardRef: { current: null },
            menuActive: null,
            setMenuActive: vi.fn(),
            isMenuOpen: false,
            setIsMenuOpen: vi.fn(),
        });
        vi.clearAllMocks();
    });

    it('renders toolbar', () => {
        render(<ToolBar />);

        expect(screen.getByTestId('toolbar-appbar')).toBeInTheDocument();
    });

    it('renders menu when open', () => {
        mockUseToolBarState.mockReturnValue({
            isManageUsersOpen: false,
            setIsManageUsersOpen: vi.fn(),
            isAddItemDrawerOpen: false,
            setIsAddItemDrawerOpen: vi.fn(),
            isAddListDrawerOpen: false,
            setIsAddListDrawerOpen: vi.fn(),
            menuCardRef: { current: null },
            menuActive: 1,
            setMenuActive: vi.fn(),
            isMenuOpen: true,
            setIsMenuOpen: vi.fn(),
        });

        render(<ToolBar />);

        expect(screen.getByTestId('hamburger-menu')).toBeInTheDocument();
    });

    it('renders ToolBarAppBar', () => {
        render(<ToolBar />);

        expect(screen.getByTestId('toolbar-appbar')).toBeInTheDocument();
    });

    it('accepts onAddList callback prop', () => {
        const mockOnAddList = vi.fn();
        render(<ToolBar onAddList={mockOnAddList} />);

        expect(screen.getByTestId('toolbar-appbar')).toBeInTheDocument();
    });

    it('accepts onAddItem callback prop', () => {
        mockUseToolBarState.mockReturnValue({
            isManageUsersOpen: false,
            setIsManageUsersOpen: vi.fn(),
            isAddItemDrawerOpen: false,
            setIsAddItemDrawerOpen: vi.fn(),
            isAddListDrawerOpen: false,
            setIsAddListDrawerOpen: vi.fn(),
            menuCardRef: { current: null },
            menuActive: null,
            setMenuActive: vi.fn(),
            isMenuOpen: false,
            setIsMenuOpen: vi.fn(),
        });

        const mockOnAddItem = vi.fn();
        render(<ToolBar onAddItem={mockOnAddItem} />);

        expect(screen.getByTestId('toolbar-appbar')).toBeInTheDocument();
    });

    it('handles goBack callback', () => {
        render(<ToolBar handleGoBack={mockHandleGoBack} />);

        expect(screen.getByTestId('toolbar-appbar')).toBeInTheDocument();
    });

    it('uses custom placeholder', () => {
        const customPlaceholder = 'Add custom item...';
        render(<ToolBar placeholder={customPlaceholder} />);

        expect(screen.getByTestId('toolbar-appbar')).toBeInTheDocument();
    });

    it('renders with disableClearSelected prop', () => {
        render(<ToolBar disableClearSelected={true} />);

        expect(screen.getByTestId('toolbar-appbar')).toBeInTheDocument();
    });

    it('renders with disableClearAll prop', () => {
        render(<ToolBar disableClearAll={true} />);

        expect(screen.getByTestId('toolbar-appbar')).toBeInTheDocument();
    });

    it('shows Items-page actions for the list owner', () => {
        mockUseLocation.mockReturnValue({ pathname: '/list/Groceries' });

        render(
            <ToolBar
                handleClearSelected={() => {}}
                handleRemoveAll={() => {}}
                currentListType={ListType.SHOPPING}
                currentList={{ title: 'Groceries', users: [], ownerId: 'user-1' }}
                listItems={[]}
            />
        );

        expect(screen.getByText('Add from Recipe')).toBeInTheDocument();
        expect(screen.getByText('Clear Selected')).toBeInTheDocument();
        expect(screen.getByText('Remove All')).toBeInTheDocument();
        expect(screen.getByText('Manage Users')).toBeInTheDocument();
    });

    it('hides Manage Users for a non-owner on the Items page', () => {
        mockUseLocation.mockReturnValue({ pathname: '/list/Groceries' });

        render(
            <ToolBar
                currentListType={ListType.SHOPPING}
                currentList={{ title: 'Groceries', users: [], ownerId: 'someone-else' }}
                listItems={[]}
            />
        );

        expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
    });

    it('shows only Add to Shopping List on the Recipe detail page', () => {
        mockUseLocation.mockReturnValue({ pathname: '/recipes/recipe-1' });

        render(<ToolBar onToggleSelectMode={() => {}} />);

        expect(screen.getByText('Add to Shopping List')).toBeInTheDocument();
        expect(screen.queryByText('Clear Selected')).not.toBeInTheDocument();
    });

    it('shows only Manage Labels on the Calendar page', () => {
        mockUseLocation.mockReturnValue({ pathname: '/calendar' });

        render(<ToolBar />);

        expect(screen.getByText('Manage Labels')).toBeInTheDocument();
        expect(screen.queryByText('Add to Shopping List')).not.toBeInTheDocument();
    });

    it('shows no actions on the Friends page', () => {
        mockUseLocation.mockReturnValue({ pathname: '/friends' });

        render(<ToolBar />);

        const fab = screen.getByTestId('actions-fab');
        expect(fab).toBeEmptyDOMElement();
    });
});
