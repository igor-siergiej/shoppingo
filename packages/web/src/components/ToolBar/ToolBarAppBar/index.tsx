import { ArrowLeft, BookOpen, CheckCheck, Menu, ShoppingCart, Trash2 } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToolBarButton } from '../ToolBarButton';

interface ToolBarAppBarProps {
    isItemsPage: boolean;
    isListsPage: boolean;
    isRecipesPage?: boolean;
    onGoBack?: () => void;
    onClearSelected?: () => void;
    onRemoveAll?: () => void;
    onMenuClick: () => void;
    disableClearSelected?: boolean;
    disableClearAll?: boolean;
    itemDrawer?: ReactNode;
    listDrawer?: ReactNode;
    recipeDrawer?: ReactNode;
}

export const ToolBarAppBar = forwardRef<HTMLDivElement, ToolBarAppBarProps>(
    (
        {
            isItemsPage,
            isListsPage,
            isRecipesPage,
            onGoBack,
            onClearSelected,
            onRemoveAll,
            onMenuClick,
            disableClearSelected = false,
            disableClearAll = false,
            itemDrawer,
            listDrawer,
            recipeDrawer,
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

        const showBackButton = isItemsPage;

        return (
            <div ref={ref} className="grid grid-cols-3 items-center py-2.5 px-3">
                {/* Left side - Navigation buttons */}
                <div className="flex items-center gap-4">
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
                        </>
                    )}
                </div>

                {/* Center - Add button */}
                <div className="flex justify-center">
                    {isItemsPage && itemDrawer}
                    {isListsPage && listDrawer}
                    {isRecipesPage && recipeDrawer}
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

                    <ToolBarButton icon={Menu} title="Menu" onClick={onMenuClick} />
                </div>
            </div>
        );
    }
);

ToolBarAppBar.displayName = 'ToolBarAppBar';
