'use client';

import { useAuth } from '@imapps/web-utils';
import { ArrowLeft, CheckCheck, Download, LogOut, Menu, Plus, Search, Trash2, User } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useMeasure from 'react-use-measure';

import { Button } from '@/components/ui/button';
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
import { RippleButton } from '@/components/ui/ripple';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { usePWA } from '../../hooks/usePWA';
import { useSearch } from '../../hooks/useSearch';
import { SearchResults } from '../SearchResults';

interface ToolBarProps {
    // For lists page: (name, selectedUsers)
    // For items page: (name, quantity, unit)
    handleAdd: (name: string, quantityOrUsers?: number | Array<string>, unit?: string) => Promise<void>;
    handleGoBack?: () => void;
    handleClearSelected?: () => void;
    handleRemoveAll?: () => void;
    placeholder?: string;
}

export interface ToolBarRef {
    openDrawer: () => void;
}

const ToolBar = forwardRef<ToolBarRef, ToolBarProps>(
    ({ handleAdd, handleGoBack, handleClearSelected, handleRemoveAll, placeholder = 'Enter item name...' }, ref) => {
        const location = useLocation();
        const navigate = useNavigate();
        const { logout } = useAuth();

        const [isDrawerOpen, setIsDrawerOpen] = useState(false);
        const [newName, setNewName] = useState('');
        const [error, setError] = useState(false);
        const [selectedUsers, setSelectedUsers] = useState<Array<string>>([]);
        const [quantity, setQuantity] = useState('');
        const [unit, setUnit] = useState('');
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
                setError(true);

                return;
            }

            if (isListsPage) {
                await handleAdd(newName.trim(), selectedUsers);
            } else {
                // Items page: pass quantity and unit
                const quantityValue = quantity.trim() ? parseFloat(quantity) : undefined;
                const unitValue = unit.trim() || undefined;
                await handleAdd(newName.trim(), quantityValue, unitValue);
            }

            setNewName('');
            setError(false);
            setSelectedUsers([]);
            setQuantity('');
            setUnit('');
            setIsDrawerOpen(false);
        };

        const handleCancel = () => {
            setNewName('');
            setError(false);
            setSelectedUsers([]);
            setQuantity('');
            setUnit('');
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
                            <CardContent className="flex items-center justify-between" ref={menuRef}>
                                {/* Add Button - Always on the left */}
                                <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                                    <DrawerTrigger asChild>
                                        <RippleButton
                                            size="icon"
                                            className="h-12 w-12 rounded-full border-2 border-primary/20 hover:border-primary/40 transition-colors"
                                        >
                                            <Plus className="h-5 w-5" />
                                        </RippleButton>
                                    </DrawerTrigger>
                                    <DrawerContent>
                                        <div className="mx-auto w-full max-w-sm">
                                            <DrawerHeader>
                                                <DrawerTitle>
                                                    {isListsPage ? 'Add New List' : 'Add New Item'}
                                                </DrawerTitle>
                                            </DrawerHeader>
                                            <div className="p-4 pb-0 space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="new-item">
                                                        {isListsPage ? 'List Name' : 'Item Name'}
                                                    </Label>
                                                    <Input
                                                        id="new-item"
                                                        ref={inputRef}
                                                        value={newName}
                                                        autoComplete="off"
                                                        autoFocus
                                                        className={error ? 'border-destructive' : ''}
                                                        onChange={(event) => {
                                                            setError(false);
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
                                                    {error && (
                                                        <p className="text-sm text-destructive">
                                                            Name cannot be blank.
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Quantity and Unit fields for items page */}
                                                {isItemsPage && (
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
                                        <ArrowLeft className="h-5 w-5" />
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
                                        <CheckCheck className="h-5 w-5" />
                                    </RippleButton>
                                )}

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
                                        <Trash2 className="h-5 w-5" />
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
                                    <Menu className="h-5 w-5" />
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
