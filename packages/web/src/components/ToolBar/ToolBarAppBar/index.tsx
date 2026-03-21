import { ArrowLeft, BookOpen, CheckCheck, Menu, ShoppingCart, Trash2 } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToolBarButton } from '../ToolBarButton';

interface ToolBarAppBarProps {
    isItemsPage: boolean;
    isListsPage: boolean;
    isRecipesPage?: boolean;
    isRecipeDetailPage?: boolean;
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
}

export const ToolBarAppBar = forwardRef<HTMLDivElement, ToolBarAppBarProps>(
    (
        {
            isItemsPage,
            isListsPage,
            isRecipesPage,
            isRecipeDetailPage,
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
            <div ref={ref} className="grid items-center py-2.5 px-3" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
                {/* Left side - Navigation buttons */}
                <div className="flex items-center gap-4 min-w-0">
                    {showBackButton ? (
                        <ToolBarButton icon={ArrowLeft} title="Go back" onClick={handleGoBack} />
                    ) : (
                        <>
                            <ToolBarButton
                                icon={ShoppingCart}
                                title="Shopping lists"
                                onClick={() => navigate('/')}
                            />
                            <ToolBarButton
                                icon={BookOpen}
                                title="Recipes"
                                onClick={() => navigate('/recipes')}
                            />
                        </>
                    )}
                    {isItemsPage && recipePickerDrawer}
                </div>

                {/* Center - Add button */}
                <div className="flex justify-center gap-2">
                    {isItemsPage && itemDrawer}
                    {isListsPage && listDrawer}
                    {isRecipesPage && recipeDrawer}
                    {isRecipeDetailPage && ingredientDrawer}
                </div>

                {/* Right side - Menu and action buttons */}
                <div className="flex items-center gap-2 justify-end">
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
            </div>
        );
    }
);

ToolBarAppBar.displayName = 'ToolBarAppBar';
