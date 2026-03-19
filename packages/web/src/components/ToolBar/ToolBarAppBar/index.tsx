import type { ListType } from '@shoppingo/types';
import { ArrowLeft, CheckCheck, Menu, Trash2 } from 'lucide-react';
import { forwardRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToolBarButton } from '../ToolBarButton';

interface ToolBarAppBarProps {
    isItemsPage: boolean;
    isListsPage: boolean;
    onGoBack?: () => void;
    onClearSelected?: () => void;
    onRemoveAll?: () => void;
    onMenuClick: () => void;
    disableClearSelected?: boolean;
    disableClearAll?: boolean;
    itemDrawer?: ReactNode;
    listDrawer?: ReactNode;
}

export const ToolBarAppBar = forwardRef<HTMLDivElement, ToolBarAppBarProps>(
    ({
        isItemsPage,
        isListsPage,
        onGoBack,
        onClearSelected,
        onRemoveAll,
        onMenuClick,
        disableClearSelected = false,
        disableClearAll = false,
        itemDrawer,
        listDrawer,
    }, ref) => {
        const navigate = useNavigate();

        const handleGoBack = () => {
            if (onGoBack) {
                onGoBack();
            } else {
                navigate('/');
            }
        };

        const showBackButton = isItemsPage || !isListsPage;

        return (
            <div
                ref={ref}
                className="flex items-center justify-between py-2.5 px-3"
            >
                {showBackButton && (
                    <ToolBarButton
                        icon={ArrowLeft}
                        title={isItemsPage ? 'Go back' : 'Go home'}
                        onClick={handleGoBack}
                    />
                )}

                {onClearSelected && (
                    <ToolBarButton
                        icon={CheckCheck}
                        title="Clear selected items"
                        onClick={onClearSelected}
                        disabled={disableClearSelected}
                    />
                )}

                {isItemsPage && itemDrawer}

                {isListsPage && listDrawer}

                {onRemoveAll && (
                    <ToolBarButton
                        icon={Trash2}
                        title="Remove all items"
                        onClick={onRemoveAll}
                        disabled={disableClearAll}
                        variant="destructive"
                    />
                )}

                <ToolBarButton
                    icon={Menu}
                    title="Menu"
                    onClick={onMenuClick}
                />
            </div>
        );
    }
);

ToolBarAppBar.displayName = 'ToolBarAppBar';
