import { ArrowLeft, BookOpen, Calendar, CheckCheck, Menu, ShoppingCart, Trash2, Users } from 'lucide-react';
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
    onClearSelected?: () => void;
    onRemoveAll?: () => void;
    onToggleSelectMode?: () => void;
    onMenuClick: () => void;
    disableClearSelected?: boolean;
    disableClearAll?: boolean;
    itemDrawer?: ReactNode;
    listDrawer?: ReactNode;
    recipeDrawer?: ReactNode;
    ingredientDrawer?: ReactNode;
    recipePickerDrawer?: ReactNode;
    todoDrawer?: ReactNode;
    friendDrawer?: ReactNode;
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
            onClearSelected,
            onRemoveAll,
            onToggleSelectMode,
            onMenuClick,
            disableClearSelected = false,
            disableClearAll = false,
            itemDrawer,
            listDrawer,
            recipeDrawer,
            ingredientDrawer,
            recipePickerDrawer,
            todoDrawer,
            friendDrawer,
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
            <div ref={ref} className="flex w-full items-center justify-around py-2.5 px-3">
                {/* Left: back or primary nav */}
                {showBackButton ? (
                    <ToolBarButton icon={ArrowLeft} title="Go back" onClick={handleGoBack} />
                ) : (
                    <>
                        <ToolBarButton
                            icon={ShoppingCart}
                            title="Shopping lists"
                            onClick={() => navigate('/')}
                            active={isListsPage}
                        />
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
                    </>
                )}

                {/* Center: context-aware add */}
                {isItemsPage && itemDrawer}
                {isListsPage && listDrawer}
                {isRecipesPage && recipeDrawer}
                {isRecipeDetailPage && ingredientDrawer}
                {isCalendarPage && todoDrawer}
                {isFriendsPage && friendDrawer}
                {isItemsPage && recipePickerDrawer}

                {/* Calendar nav — right of the + */}
                <ToolBarButton
                    icon={Calendar}
                    title="Calendar"
                    onClick={() => navigate('/calendar')}
                    active={isCalendarPage}
                />

                {/* Right: contextual actions + menu */}
                {onClearSelected && (
                    <ToolBarButton
                        icon={CheckCheck}
                        title="Clear selected items"
                        onClick={onClearSelected}
                        disabled={disableClearSelected}
                    />
                )}
                {onRemoveAll && (
                    <ToolBarButton
                        icon={Trash2}
                        title="Remove all items"
                        onClick={onRemoveAll}
                        disabled={disableClearAll}
                        variant="destructive"
                    />
                )}
                {isRecipeDetailPage && onToggleSelectMode && (
                    <ToolBarButton icon={ShoppingCart} title="Add to shopping list" onClick={onToggleSelectMode} />
                )}
                <ToolBarButton icon={Menu} title="Menu" onClick={onMenuClick} />
            </div>
        );
    }
);

ToolBarAppBar.displayName = 'ToolBarAppBar';
