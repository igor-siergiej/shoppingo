'use client';

import { useAuth, useUser } from '@imapps/web-utils';
import type { Item } from '@shoppingo/types';
import { ListType } from '@shoppingo/types';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useMeasure from 'react-use-measure';

import { Card } from '../../components/ui/card';
import { useToolBarState } from '../../hooks/useToolBarState';
import { ManageUsersDrawer } from '../ManageUsersDrawer';
import { AddFromRecipeDrawer } from './AddFromRecipeDrawer';
import { AddIngredientDrawer } from './AddIngredientDrawer';
import { AddItemDrawer } from './AddItemDrawer';
import { AddListDrawer } from './AddListDrawer';
import { AddRecipeDrawer } from './AddRecipeDrawer';
import { HamburgerMenu } from './HamburgerMenu';
import { ToolBarAppBar } from './ToolBarAppBar';

interface ToolBarProps {
    onAddList?: (name: string, listType: ListType, users: string[]) => Promise<void>;
    onAddItem?: (name: string, quantity?: number, unit?: string, dueDate?: Date) => Promise<void>;
    onAddIngredient?: (name: string, quantity?: number, unit?: string) => Promise<void>;
    onAddRecipe?: (
        title: string,
        ingredients: Array<{ name: string; quantity?: number; unit?: string }>,
        imageKey?: string,
        selectedUsers?: string[]
    ) => Promise<void>;
    onRefetchRecipes?: () => Promise<void>;
    handleGoBack?: () => void;
    handleClearSelected?: () => void;
    handleRemoveAll?: () => void;
    onToggleSelectMode?: () => void;
    placeholder?: string;
    currentListType?: ListType;
    currentList?: {
        title: string;
        users: Array<{ id: string; username: string }>;
        ownerId?: string;
    };
    listItems?: Item[];
    refetchList?: () => void;
    disableClearSelected?: boolean;
    disableClearAll?: boolean;
}

const ToolBar = ({
    onAddList,
    onAddItem,
    onAddIngredient,
    onAddRecipe,
    onRefetchRecipes,
    handleGoBack,
    handleClearSelected,
    handleRemoveAll,
    onToggleSelectMode,
    placeholder = 'Enter item name...',
    currentListType,
    currentList,
    listItems,
    refetchList,
    disableClearSelected = false,
    disableClearAll = false,
}: ToolBarProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { user } = useUser();
    const userId = user?.id;

    const {
        isManageUsersOpen,
        setIsManageUsersOpen,
        isAddItemDrawerOpen,
        setIsAddItemDrawerOpen,
        isAddListDrawerOpen,
        setIsAddListDrawerOpen,
        isAddRecipeDrawerOpen,
        setIsAddRecipeDrawerOpen,
        menuCardRef,
        menuActive,
        setMenuActive,
        isMenuOpen,
        setIsMenuOpen,
    } = useToolBarState();

    const [isAddIngredientDrawerOpen, setIsAddIngredientDrawerOpen] = useState(false);
    const [isAddFromRecipeDrawerOpen, setIsAddFromRecipeDrawerOpen] = useState(false);

    const isItemsPage = location.pathname.includes('/list/');
    const isListsPage = location.pathname === '/';
    const isRecipesPage = location.pathname === '/recipes';
    const isRecipeDetailPage = location.pathname.includes('/recipes/');

    const [contentRef, { height: contentHeight }] = useMeasure();
    const [menuRef, { width: menuWidth }] = useMeasure();
    const [maxWidth, setMaxWidth] = useState(0);

    useEffect(() => {
        if (!menuWidth || maxWidth > 0) return;
        setMaxWidth(menuWidth);
    }, [menuWidth, maxWidth]);

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
                                    background: 'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.02) 100%)',
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
                            <ToolBarAppBar
                                ref={menuRef}
                                isItemsPage={isItemsPage}
                                isListsPage={isListsPage}
                                isRecipesPage={isRecipesPage}
                                isRecipeDetailPage={isRecipeDetailPage}
                                onGoBack={handleGoBack}
                                onClearSelected={handleClearSelected}
                                onRemoveAll={handleRemoveAll}
                                onToggleSelectMode={onToggleSelectMode}
                                onMenuClick={() => {
                                    setIsMenuOpen(!isMenuOpen);
                                    if (!isMenuOpen) {
                                        setMenuActive(1);
                                    } else {
                                        setMenuActive(null);
                                    }
                                }}
                                disableClearSelected={disableClearSelected}
                                disableClearAll={disableClearAll}
                                itemDrawer={
                                    isItemsPage && onAddItem ? (
                                        <AddItemDrawer
                                            open={isAddItemDrawerOpen}
                                            onOpenChange={setIsAddItemDrawerOpen}
                                            onAdd={onAddItem}
                                            listType={currentListType}
                                            placeholder={placeholder}
                                        />
                                    ) : undefined
                                }
                                listDrawer={
                                    isListsPage && onAddList ? (
                                        <AddListDrawer
                                            open={isAddListDrawerOpen}
                                            onOpenChange={setIsAddListDrawerOpen}
                                            onAdd={onAddList}
                                            placeholder={placeholder}
                                        />
                                    ) : undefined
                                }
                                recipeDrawer={
                                    isRecipesPage && onAddRecipe ? (
                                        <AddRecipeDrawer
                                            open={isAddRecipeDrawerOpen}
                                            onOpenChange={setIsAddRecipeDrawerOpen}
                                            onAdd={onAddRecipe}
                                            onRefetch={onRefetchRecipes}
                                            placeholder={placeholder}
                                        />
                                    ) : undefined
                                }
                                ingredientDrawer={
                                    isRecipeDetailPage && onAddIngredient ? (
                                        <AddIngredientDrawer
                                            open={isAddIngredientDrawerOpen}
                                            onOpenChange={setIsAddIngredientDrawerOpen}
                                            onAdd={onAddIngredient}
                                        />
                                    ) : undefined
                                }
                                recipePickerDrawer={
                                    isItemsPage && currentList && listItems && currentListType === ListType.SHOPPING ? (
                                        <AddFromRecipeDrawer
                                            open={isAddFromRecipeDrawerOpen}
                                            onOpenChange={setIsAddFromRecipeDrawerOpen}
                                            listTitle={currentList.title}
                                            listItems={listItems}
                                        />
                                    ) : undefined
                                }
                            />
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
