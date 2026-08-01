import { ArrowLeft, BookOpen, Calendar, Menu, ShoppingCart, Users } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToolBarButton } from '../ToolBarButton';

interface ToolBarAppBarProps {
    isItemsPage: boolean;
    isListsPage: boolean;
    isRecipesPage?: boolean;
    isRecipeDetailPage?: boolean;
    isCalendarPage?: boolean;
    isFriendsPage?: boolean;
    onGoBack?: () => void;
    onMenuClick: () => void;
    itemDrawer?: ReactNode;
    listDrawer?: ReactNode;
    recipeDrawer?: ReactNode;
    ingredientDrawer?: ReactNode;
    todoDrawer?: ReactNode;
    friendDrawer?: ReactNode;
    actionsFab?: ReactNode;
}

export const ToolBarAppBar = forwardRef<HTMLDivElement, ToolBarAppBarProps>(
    (
        {
            isItemsPage,
            isListsPage,
            isRecipesPage,
            isRecipeDetailPage,
            isCalendarPage,
            isFriendsPage,
            onGoBack,
            onMenuClick,
            itemDrawer,
            listDrawer,
            recipeDrawer,
            ingredientDrawer,
            todoDrawer,
            friendDrawer,
            actionsFab,
        },
        ref
    ) => {
        const navigate = useNavigate();

        const handleGoBack = () => {
            if (onGoBack) {
                onGoBack();
            } else {
                navigate('/');
            }
        };

        const showBackButton = isItemsPage || isRecipeDetailPage;

        return (
            <div ref={ref} className="flex w-full items-center justify-between py-2.5 px-3">
                {/* Left: primary nav — Shopping lists slot swaps for back on drill-in pages */}
                <div className="flex items-center gap-1">
                    {showBackButton ? (
                        <ToolBarButton icon={ArrowLeft} title="Go back" onClick={handleGoBack} />
                    ) : (
                        <ToolBarButton
                            icon={ShoppingCart}
                            title="Shopping lists"
                            onClick={() => navigate('/')}
                            active={isListsPage}
                        />
                    )}
                    <ToolBarButton
                        icon={BookOpen}
                        title="Recipes"
                        onClick={() => navigate('/recipes')}
                        active={isRecipesPage}
                    />
                    <ToolBarButton
                        icon={Users}
                        title="Friends"
                        onClick={() => navigate('/friends')}
                        active={isFriendsPage}
                    />
                </div>

                {/* Center: context-aware add */}
                <div className="flex items-center gap-1">
                    {isItemsPage && itemDrawer}
                    {isListsPage && listDrawer}
                    {isRecipesPage && recipeDrawer}
                    {isRecipeDetailPage && ingredientDrawer}
                    {isCalendarPage && todoDrawer}
                    {isFriendsPage && friendDrawer}
                    {actionsFab}
                </div>

                {/* Right: calendar nav + menu — always present, page actions live in ActionsFab, not here */}
                <div className="flex items-center gap-1">
                    <ToolBarButton
                        icon={Calendar}
                        title="Calendar"
                        onClick={() => navigate('/calendar')}
                        active={isCalendarPage}
                    />
                    <ToolBarButton icon={Menu} title="Menu" onClick={onMenuClick} />
                </div>
            </div>
        );
    }
);

ToolBarAppBar.displayName = 'ToolBarAppBar';
