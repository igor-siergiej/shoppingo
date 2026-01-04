'use client';

import { useAuth } from '@imapps/web-utils';
import type { ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { format } from 'date-fns';
import {
    ArrowLeft,
    Calendar as CalendarIcon,
    CheckCheck,
    Download,
    LogOut,
    Menu,
    Plus,
    Search,
    Trash2,
    User,
} from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useMeasure from 'react-use-measure';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RippleButton } from '@/components/ui/ripple';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { usePWA } from '../../hooks/usePWA';
import { useSearch } from '../../hooks/useSearch';
import { SearchResults } from '../SearchResults';

interface ToolBarProps {
    // For lists page: (name, selectedUsers, listType)
    // For items page: (name, quantity, unit, dueDate)
    handleAdd: (name: string, quantityOrUsers?: number | Array<string>, unit?: string, dueDate?: Date) => Promise<void>;
    handleGoBack?: () => void;
    handleClearSelected?: () => void;
    handleRemoveAll?: () => void;
    placeholder?: string;
    currentListType?: ListType;
}

export interface ToolBarRef {
    openDrawer: () => void;
}

const ToolBar = forwardRef<ToolBarRef, ToolBarProps>(
    (
        {
            handleAdd,
            handleGoBack,
            handleClearSelected,
            handleRemoveAll,
            placeholder = 'Enter item name...',
            currentListType,
        },
        ref
    ) => {
        const location = useLocation();
        const navigate = useNavigate();
        const { logout } = useAuth();

        const [isDrawerOpen, setIsDrawerOpen] = useState(false);
        const [newName, setNewName] = useState('');
        const [error, setError] = useState<string>('');
        const [selectedUsers, setSelectedUsers] = useState<Array<string>>([]);
        const [quantity, setQuantity] = useState('');
        const [unit, setUnit] = useState('');
        const [listType, setListType] = useState<ListType>(ListTypeEnum.SHOPPING);
        const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
        const inputRef = useRef<HTMLInputElement>(null);
        const menuCardRef = useRef<HTMLDivElement>(null);

        const isItemsPage = location.pathname.includes('/list/');
        const isListsPage = location.pathname === '/';

        const { query, setQuery, results, isLoading, error: searchError, clearResults } = useSearch();

        // Hamburger expandable menu state (reusing ToolBarOld transitions)
        const [menuActive, setMenuActive] = useState<number | null>(null);
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const [contentRef, { height: contentHeight }] = useMeasure();
        const [menuRef, { width: menuWidth }] = useMeasure();
        const [maxWidth, setMaxWidth] = useState(0);

        useEffect(() => {
            if (!menuWidth || maxWidth > 0) return;
            setMaxWidth(menuWidth);
        }, [menuWidth, maxWidth]);

        // PWA functionality
        const { canInstall, isInstalled, installApp } = usePWA();

        // Expose method to open drawer from parent component
        useImperativeHandle(ref, () => ({
            openDrawer: () => setIsDrawerOpen(true),
        }));

        // Close menu when clicking outside (works on mobile and desktop)
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

        useEffect(() => {
            if (isDrawerOpen && inputRef.current) {
                // Longer timeout for mobile devices to ensure drawer animation completes
                const timeoutId = setTimeout(() => {
                    inputRef.current?.focus();
                    // Scroll the input into view on mobile
                    if (inputRef.current) {
                        inputRef.current.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'nearest',
                        });
                    }
                }, 250);

                return () => clearTimeout(timeoutId);
            }
        }, [isDrawerOpen]);

        const validateForm = () => {
            return newName.length === 0;
        };

        const handleSubmit = async () => {
            if (validateForm()) {
                setError('Name cannot be blank.');

                return;
            }

            try {
                if (isListsPage) {
                    // For lists: pass name, selectedUsers, and listType
                    await handleAdd(newName.trim(), selectedUsers, listType);
                } else {
                    // Items page: pass quantity, unit, and dueDate
                    const quantityValue = quantity.trim() ? parseFloat(quantity) : undefined;
                    const unitValue = unit.trim() || undefined;
                    await handleAdd(newName.trim(), quantityValue, unitValue, dueDate);
                }

                setNewName('');
                setError('');
                setSelectedUsers([]);
                setQuantity('');
                setUnit('');
                setListType(ListTypeEnum.SHOPPING);
                setDueDate(undefined);
                setIsDrawerOpen(false);
            } catch (err: any) {
                // Display error message from backend
                setError(err?.message || 'Failed to add item. Please try again.');
            }
        };

        const handleCancel = () => {
            setNewName('');
            setError('');
            setSelectedUsers([]);
            setQuantity('');
            setUnit('');
            setListType(ListTypeEnum.SHOPPING);
            setDueDate(undefined);
            setQuery('');
            clearResults();
            setIsDrawerOpen(false);
        };

        const handleUserSelect = (username: string) => {
            if (!selectedUsers.includes(username)) {
                setSelectedUsers([...selectedUsers, username]);
            }

            setQuery('');
            clearResults();
        };

        const removeSelectedUser = (username: string) => {
            setSelectedUsers(selectedUsers.filter((u) => u !== username));
        };

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
            <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
                <div className="mx-auto max-w-[400px]">
                    <MotionConfig transition={transition}>
                        <Card ref={menuCardRef} className="shadow-lg py-2 !gap-0">
                            <div className="overflow-hidden">
                                <AnimatePresence initial={false} mode="sync">
                                    {isMenuOpen ? (
                                        <motion.div
                                            key="content"
                                            initial={{ height: 0 }}
                                            animate={{ height: contentHeight || 0 }}
                                            exit={{ height: 0 }}
                                            style={{ width: maxWidth }}
                                        >
                                            <div ref={contentRef} className="p-3">
                                                {menuActive === 1 && (
                                                    <div className="flex flex-col space-y-3">
                                                        {/* Install app action (shows only if available and not installed) */}
                                                        {canInstall && !isInstalled && (
                                                            <Button
                                                                variant="outline"
                                                                onClick={async () => {
                                                                    const success = await installApp();

                                                                    if (success) {
                                                                        setIsMenuOpen(false);
                                                                        setMenuActive(null);
                                                                    }
                                                                }}
                                                                className="justify-center"
                                                            >
                                                                <Download className="h-4 w-4 mr-2" />
                                                                Install app
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="destructive"
                                                            onClick={() => {
                                                                void handleLogout();
                                                                setIsMenuOpen(false);
                                                                setMenuActive(null);
                                                            }}
                                                            className="justify-center"
                                                        >
                                                            <LogOut className="h-4 w-4 mr-2" />
                                                            Log out
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ) : null}
                                </AnimatePresence>
                            </div>
                            <CardContent className={`flex items-center justify-between`} ref={menuRef}>
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

                                {/* Clear Selected Button - Separate button */}
                                {handleClearSelected && (
                                    <RippleButton
                                        size="icon"
                                        variant="ghost"
                                        className="h-12 w-12 rounded-full transition-colors"
                                        rippleClassName="bg-gray-500/30"
                                        title="Clear selected items"
                                        onClick={handleClearSelected}
                                    >
                                        <CheckCheck className="size-5" />
                                    </RippleButton>
                                )}

                                <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                                    <DrawerTrigger asChild>
                                        <RippleButton
                                            size="icon"
                                            className="h-12 w-12 rounded-full border-2 border-primary/20 hover:border-primary/40 transition-colors"
                                        >
                                            <Plus className="size-5" />
                                        </RippleButton>
                                    </DrawerTrigger>
                                    <DrawerContent>
                                        <div className="mx-auto w-full max-w-sm">
                                            <DrawerHeader>
                                                <DrawerTitle>
                                                    {isListsPage
                                                        ? 'Add New List'
                                                        : currentListType === ListTypeEnum.TODO
                                                          ? 'Add New Task'
                                                          : 'Add New Item'}
                                                </DrawerTitle>
                                            </DrawerHeader>
                                            <div className="p-4 pb-0 space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="new-item">
                                                        {isListsPage
                                                            ? 'List Name'
                                                            : currentListType === ListTypeEnum.TODO
                                                              ? 'Task Name'
                                                              : 'Item Name'}
                                                    </Label>
                                                    <Input
                                                        id="new-item"
                                                        ref={inputRef}
                                                        value={newName}
                                                        autoComplete="off"
                                                        autoFocus
                                                        className={`${error ? 'border-destructive' : ''} h-12 text-base`}
                                                        onChange={(event) => {
                                                            setError('');
                                                            setNewName(event.target.value);
                                                        }}
                                                        placeholder={placeholder}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleSubmit();
                                                            } else if (e.key === 'Escape') {
                                                                handleCancel();
                                                            }
                                                        }}
                                                    />
                                                    {error && <p className="text-sm text-destructive">{error}</p>}
                                                </div>

                                                {/* List type selector for lists page */}
                                                {isListsPage && (
                                                    <div className="space-y-2">
                                                        <Label>List Type</Label>
                                                        <div className="flex gap-4">
                                                            <div className="flex items-center space-x-2">
                                                                <input
                                                                    type="radio"
                                                                    id="shopping"
                                                                    name="listType"
                                                                    checked={listType === ListTypeEnum.SHOPPING}
                                                                    onChange={() => setListType(ListTypeEnum.SHOPPING)}
                                                                    className="cursor-pointer"
                                                                />
                                                                <Label
                                                                    htmlFor="shopping"
                                                                    className="cursor-pointer font-normal"
                                                                >
                                                                    Shopping
                                                                </Label>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <input
                                                                    type="radio"
                                                                    id="todo"
                                                                    name="listType"
                                                                    checked={listType === ListTypeEnum.TODO}
                                                                    onChange={() => setListType(ListTypeEnum.TODO)}
                                                                    className="cursor-pointer"
                                                                />
                                                                <Label
                                                                    htmlFor="todo"
                                                                    className="cursor-pointer font-normal"
                                                                >
                                                                    TODO
                                                                </Label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Quantity and Unit fields for shopping lists */}
                                                {isItemsPage && currentListType === ListTypeEnum.SHOPPING && (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label htmlFor="new-item-quantity">Quantity</Label>
                                                            <Input
                                                                id="new-item-quantity"
                                                                type="number"
                                                                value={quantity}
                                                                onChange={(e) => setQuantity(e.target.value)}
                                                                placeholder="e.g., 2"
                                                                className="mt-2"
                                                                step="0.01"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="new-item-unit">Unit</Label>
                                                            <Select value={unit} onValueChange={setUnit}>
                                                                <SelectTrigger id="new-item-unit" className="mt-2">
                                                                    <SelectValue placeholder="Select unit" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="pcs">pcs</SelectItem>
                                                                    <SelectItem value="g">g</SelectItem>
                                                                    <SelectItem value="kg">kg</SelectItem>
                                                                    <SelectItem value="ml">ml</SelectItem>
                                                                    <SelectItem value="L">L</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Due date picker for TODO lists */}
                                                {isItemsPage && currentListType === ListTypeEnum.TODO && (
                                                    <div className="space-y-2">
                                                        <Label>Due Date (Optional)</Label>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    data-empty={!dueDate}
                                                                    className="data-[empty=true]:text-muted-foreground w-[280px] justify-start text-left font-normal"
                                                                >
                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                    {dueDate ? (
                                                                        format(dueDate, 'PPP')
                                                                    ) : (
                                                                        <span>Pick a date</span>
                                                                    )}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent
                                                                className="w-auto overflow-visible p-0"
                                                                align="start"
                                                                side="top"
                                                                sideOffset={4}
                                                            >
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={dueDate}
                                                                    onSelect={setDueDate}
                                                                    className="rounded-md border shadow-sm"
                                                                    captionLayout="dropdown"
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                )}

                                                {/* Fallback quantity/unit for items page when no list type is known */}
                                                {isItemsPage && !currentListType && (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label htmlFor="new-item-quantity">Quantity</Label>
                                                            <Input
                                                                id="new-item-quantity"
                                                                type="number"
                                                                value={quantity}
                                                                onChange={(e) => setQuantity(e.target.value)}
                                                                placeholder="e.g., 2"
                                                                className="mt-2"
                                                                step="0.01"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label htmlFor="new-item-unit">Unit</Label>
                                                            <Select value={unit} onValueChange={setUnit}>
                                                                <SelectTrigger id="new-item-unit" className="mt-2">
                                                                    <SelectValue placeholder="Select unit" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="pcs">pcs</SelectItem>
                                                                    <SelectItem value="g">g</SelectItem>
                                                                    <SelectItem value="kg">kg</SelectItem>
                                                                    <SelectItem value="ml">ml</SelectItem>
                                                                    <SelectItem value="L">L</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Search functionality for lists page */}
                                                {isListsPage && (
                                                    <div className="space-y-2">
                                                        <Label htmlFor="search-users">Search Users to Share With</Label>
                                                        <div className="relative">
                                                            <div className="relative">
                                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                <Input
                                                                    id="search-users"
                                                                    value={query}
                                                                    onChange={(e) => setQuery(e.target.value)}
                                                                    placeholder="Search users..."
                                                                    className="pl-10"
                                                                />
                                                            </div>
                                                            <SearchResults
                                                                results={results}
                                                                isLoading={isLoading}
                                                                error={searchError}
                                                                onSelect={handleUserSelect}
                                                                onClose={clearResults}
                                                                query={query}
                                                            />
                                                        </div>

                                                        {/* Selected users */}
                                                        {selectedUsers.length > 0 && (
                                                            <div className="space-y-2">
                                                                <Label className="text-sm text-muted-foreground">
                                                                    Selected Users:
                                                                </Label>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {selectedUsers.map((username) => (
                                                                        <div
                                                                            key={username}
                                                                            className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                                                                        >
                                                                            <User className="h-3 w-3" />
                                                                            <span>{username}</span>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-4 w-4 p-0 hover:bg-secondary-foreground/20"
                                                                                onClick={() =>
                                                                                    removeSelectedUser(username)
                                                                                }
                                                                            >
                                                                                ×
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <DrawerFooter>
                                                <Button onClick={handleSubmit}>
                                                    {isListsPage ? 'Add List' : 'Add Item'}
                                                </Button>
                                                <DrawerClose asChild>
                                                    <Button variant="outline" onClick={handleCancel}>
                                                        Cancel
                                                    </Button>
                                                </DrawerClose>
                                            </DrawerFooter>
                                        </div>
                                    </DrawerContent>
                                </Drawer>

                                {/* Delete All Button - Separate button */}
                                {handleRemoveAll && (
                                    <RippleButton
                                        size="icon"
                                        variant="ghost"
                                        className="h-12 w-12 rounded-full text-destructive hover:text-destructive transition-colors"
                                        rippleClassName="bg-red-500/30"
                                        title="Delete all items"
                                        onClick={handleRemoveAll}
                                    >
                                        <Trash2 className="size-5" />
                                    </RippleButton>
                                )}

                                {/* Hamburger Menu - far right */}
                                <RippleButton
                                    size="icon"
                                    variant="ghost"
                                    className="h-12 w-12 rounded-full transition-colors"
                                    rippleClassName="bg-gray-500/30"
                                    title="More"
                                    onClick={() => {
                                        if (!isMenuOpen) setIsMenuOpen(true);
                                        if (menuActive === 1) {
                                            setIsMenuOpen(false);
                                            setMenuActive(null);

                                            return;
                                        }

                                        setMenuActive(1);
                                    }}
                                >
                                    <Menu className="size-5" />
                                </RippleButton>
                            </CardContent>
                        </Card>
                    </MotionConfig>
                </div>
            </div>
        );
    }
);

ToolBar.displayName = 'ToolBar';

export default ToolBar;
