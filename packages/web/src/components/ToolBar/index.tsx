'use client';

import { useAuth, useUser } from '@igor-siergiej/web-utils';
import type { ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { ArrowLeft, CheckCheck, Menu, Trash2 } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useMeasure from 'react-use-measure';

import { Card, CardContent } from '@/components/ui/card';
import { RippleButton } from '@/components/ui/ripple';

import { AddItemDrawer } from './AddItemDrawer';
import { AddListDrawer } from './AddListDrawer';
import { HamburgerMenu } from './HamburgerMenu';
import { ManageUsersDrawer } from '../ManageUsersDrawer';

interface ToolBarProps {
    onAddList?: (name: string, listType: ListType, users: string[]) => Promise<void>;
    onAddItem?: (name: string, quantity?: number, unit?: string, dueDate?: Date) => Promise<void>;
    handleGoBack?: () => void;
    handleClearSelected?: () => void;
    handleRemoveAll?: () => void;
    placeholder?: string;
    currentListType?: ListType;
    currentList?: {
        title: string;
        users: Array<{ id: string; username: string }>;
        ownerId?: string;
    };
    refetchList?: () => void;
    disableClearSelected?: boolean;
    disableClearAll?: boolean;
}

const ToolBar = ({
    onAddList,
    onAddItem,
    handleGoBack,
    handleClearSelected,
    handleRemoveAll,
    placeholder = 'Enter item name...',
    currentListType,
    currentList,
    refetchList,
    disableClearSelected = false,
    disableClearAll = false,
}: ToolBarProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { user } = useUser();
    const userId = user?.id;

    const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
    const [isAddItemDrawerOpen, setIsAddItemDrawerOpen] = useState(false);
    const [isAddListDrawerOpen, setIsAddListDrawerOpen] = useState(false);
    const menuCardRef = useRef<HTMLDivElement>(null);

    const isItemsPage = location.pathname.includes('/list/');
    const isListsPage = location.pathname === '/';

    const [menuActive, setMenuActive] = useState<number | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [contentRef, { height: contentHeight }] = useMeasure();
    const [menuRef, { width: menuWidth }] = useMeasure();
    const [maxWidth, setMaxWidth] = useState(0);

    useEffect(() => {
        if (!menuWidth || maxWidth > 0) return;
        setMaxWidth(menuWidth);
    }, [menuWidth, maxWidth]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (menuCardRef.current && !menuCardRef.current.contains(event.target as Node) && isMenuOpen) {
                setIsMenuOpen(false);
                setMenuActive(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isMenuOpen]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const transition = {
        type: 'spring' as const,
        bounce: 0.1,
        duration: 0.25,
    };

    return (
        <>
            <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
                <div className="mx-auto max-w-[400px]">
                    <MotionConfig transition={transition}>
                        {/* Menu Container - Layered Glass Effect */}
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute bottom-0 left-0 right-0 pointer-events-none"
                                style={{
                                    background:
                                        'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.02) 100%)',
                                }}
                            />
                        )}

                        <Card
                            ref={menuCardRef}
                            className="shadow-xl py-0 !gap-0 backdrop-blur-sm border border-slate-200/50 relative z-10"
                        >
                            {/* Menu Content with Staggered Animation */}
                            <div className="overflow-hidden">
                                <AnimatePresence initial={false} mode="sync">
                                    {isMenuOpen ? (
                                        <motion.div
                                            key="content"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: contentHeight || 0, opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{
                                                height: { duration: 0.3 },
                                                opacity: { duration: 0.2 },
                                            }}
                                            style={{ width: maxWidth }}
                                        >
                                            <div ref={contentRef} className="px-3 py-4">
                                                {menuActive === 1 && (
                                                    <HamburgerMenu
                                                        currentList={currentList}
                                                        userId={userId}
                                                        onManageUsers={() => {
                                                            setIsManageUsersOpen(true);
                                                            setIsMenuOpen(false);
                                                            setMenuActive(null);
                                                        }}
                                                        onClose={() => {
                                                            setIsMenuOpen(false);
                                                            setMenuActive(null);
                                                        }}
                                                        onLogout={() => {
                                                            void handleLogout();
                                                            setIsMenuOpen(false);
                                                            setMenuActive(null);
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </motion.div>
                                    ) : null}
                                </AnimatePresence>
                            </div>
                            {/* Visual Separator - Divider Line */}
                            {isMenuOpen && (
                                <div className="h-0.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                            )}

                            {/* App Bar - The persistent bottom navigation */}
                            <CardContent className="flex items-center justify-between py-2.5" ref={menuRef}>
                                {(isItemsPage || location.pathname !== '/') && (
                                    <RippleButton
                                        size="icon"
                                        variant="ghost"
                                        className="h-12 w-12 rounded-full transition-colors"
                                        rippleClassName="bg-gray-500/30"
                                        title={isItemsPage && handleGoBack ? 'Go back' : 'Go home'}
                                        onClick={() => {
                                            if (isItemsPage && handleGoBack) {
                                                handleGoBack();
                                            } else {
                                                navigate('/');
                                            }
                                        }}
                                    >
                                        <ArrowLeft className="size-5" />
                                    </RippleButton>
                                )}

                                {/* Clear Selected Button */}
                                {handleClearSelected && (
                                    <RippleButton
                                        size="icon"
                                        variant="ghost"
                                        className="h-12 w-12 rounded-full transition-colors"
                                        rippleClassName="bg-gray-500/30"
                                        title="Clear selected items"
                                        onClick={handleClearSelected}
                                        disabled={disableClearSelected}
                                    >
                                        <CheckCheck className="size-5" />
                                    </RippleButton>
                                )}

                                {/* Add Item/List Drawer */}
                                {isItemsPage && onAddItem && (
                                    <AddItemDrawer
                                        open={isAddItemDrawerOpen}
                                        onOpenChange={setIsAddItemDrawerOpen}
                                        onAdd={onAddItem}
                                        listType={currentListType}
                                        placeholder={placeholder}
                                    />
                                )}

                                {isListsPage && onAddList && (
                                    <AddListDrawer
                                        open={isAddListDrawerOpen}
                                        onOpenChange={setIsAddListDrawerOpen}
                                        onAdd={onAddList}
                                        placeholder={placeholder}
                                    />
                                )}

                                {/* Remove All Button */}
                                {handleRemoveAll && (
                                    <RippleButton
                                        size="icon"
                                        variant="ghost"
                                        className="h-12 w-12 rounded-full transition-colors text-destructive hover:bg-destructive/10"
                                        rippleClassName="bg-destructive/30"
                                        title="Remove all items"
                                        onClick={handleRemoveAll}
                                        disabled={disableClearAll}
                                    >
                                        <Trash2 className="size-5" />
                                    </RippleButton>
                                )}

                                {/* Menu Button */}
                                <RippleButton
                                    size="icon"
                                    variant="ghost"
                                    className="h-12 w-12 rounded-full transition-colors"
                                    rippleClassName="bg-gray-500/30"
                                    title="Menu"
                                    onClick={() => {
                                        setIsMenuOpen(!isMenuOpen);
                                        if (!isMenuOpen) {
                                            setMenuActive(1);
                                        } else {
                                            setMenuActive(null);
                                        }
                                    }}
                                >
                                    <Menu className="size-5" />
                                </RippleButton>
                            </CardContent>
                        </Card>
                    </MotionConfig>
                </div>
            </div>

            {/* ManageUsersDrawer and Drawer backdrop */}
            {currentList && isItemsPage && (
                <ManageUsersDrawer
                    open={isManageUsersOpen}
                    onOpenChange={setIsManageUsersOpen}
                    currentList={currentList}
                    refetchList={refetchList}
                />
            )}
        </>
    );
};

export default ToolBar;
