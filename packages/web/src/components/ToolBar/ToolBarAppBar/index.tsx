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
            <div ref={ref} className="flex items-center justify-between py-2.5 px-3">
                {/* Left side - Navigation buttons */}
                <div className="flex items-center gap-4">
                    {showBackButton ? (
                        <ToolBarButton icon={ArrowLeft} title="Go back" onClick={handleGoBack} />
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                title="Shopping lists"
                                className={`p-3 rounded-lg transition-colors ${
                                    isListsPage
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-muted-foreground hover:bg-secondary'
                                }`}
                            >
                                <ShoppingCart className="h-6 w-6" />
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/recipes')}
                                title="Recipes"
                                className={`p-3 rounded-lg transition-colors ${
                                    isRecipesPage
                                        ? 'bg-primary/20 text-primary'
                                        : 'text-muted-foreground hover:bg-secondary'
                                }`}
                            >
                                <BookOpen className="h-6 w-6" />
                            </button>
                        </>
                    )}
                </div>

                {/* Center - Add button */}
                <div>
                    {isItemsPage && itemDrawer}
                    {isListsPage && listDrawer}
                    {isRecipesPage && recipeDrawer}
                </div>

                {/* Right side - Menu and action buttons */}
                <div className="flex items-center gap-1">
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
