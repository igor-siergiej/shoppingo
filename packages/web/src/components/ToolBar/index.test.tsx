import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ToolBar from './index';

const { mockLogout, mockNavigate, mockUseToolBarState, mockHandleGoBack } = vi.hoisted(() => ({
    mockLogout: vi.fn(),
    mockNavigate: vi.fn(),
    mockHandleGoBack: vi.fn(),
    mockUseToolBarState: vi.fn(),
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
    useLocation: () => ({ pathname: '/lists' }),
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
    ToolBarAppBar: ({ onMenuClick, itemDrawer, listDrawer }: any) => (
        <div data-testid="toolbar-appbar">
            <button type="button" onClick={onMenuClick}>
                Menu
            </button>
            {itemDrawer}
            {listDrawer}
        </div>
    ),
}));

vi.mock('../ManageUsersDrawer', () => ({
    ManageUsersDrawer: () => <div data-testid="manage-users-drawer">Users</div>,
}));

describe('ToolBar', () => {
    beforeEach(() => {
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
});
