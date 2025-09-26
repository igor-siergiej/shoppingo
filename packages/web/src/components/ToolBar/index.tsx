'use client';

import { useAuth } from '@igor-siergiej/web-utils';
import { ArrowLeft, CheckCheck, Download, LogOut, Menu, Plus, RefreshCw, Search, Trash2, User, X } from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
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

import { usePWA } from '../../hooks/usePWA';
import { useSearch } from '../../hooks/useSearch';
import { SearchResults } from '../SearchResults';

interface ToolBarProps {
    handleAdd: (name: string, selectedUsers?: Array<string>) => Promise<void>;
    handleGoBack?: () => void;
    handleClearSelected?: () => void;
    handleRemoveAll?: () => void;
    placeholder?: string;
}

export default function ToolBar({
    handleAdd,
    handleGoBack,
    handleClearSelected,
    handleRemoveAll,
    placeholder = 'Enter item name...',
}: ToolBarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [error, setError] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<Array<string>>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const isItemsPage = location.pathname.includes('/list/');
    const isListsPage = location.pathname === '/';

    // Search functionality
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
    const { canInstall, isInstalled, hasUpdate, installApp, updateApp, dismissUpdate } = usePWA();

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
                        inline: 'nearest'
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

        await handleAdd(newName.trim(), selectedUsers);
        setNewName('');
        setError(false);
        setSelectedUsers([]);
        setIsDrawerOpen(false);
    };

    const handleCancel = () => {
        setNewName('');
        setError(false);
        setSelectedUsers([]);
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
        setSelectedUsers(selectedUsers.filter(u => u !== username));
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
        <>
            <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
                <div className="mx-auto max-w-[400px]">
                    <MotionConfig transition={transition}>
                        <Card className="shadow-lg py-2 !gap-0">
                            <div className="overflow-hidden">
                                <AnimatePresence initial={false} mode="sync">
                                    {
                                        isMenuOpen
                                            ? (
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
                                                                    {/* Update available notification */}
                                                                    {hasUpdate && (
                                                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <div className="flex items-center space-x-2">
                                                                                    <RefreshCw className="h-4 w-4 text-blue-600" />
                                                                                    <span className="text-sm font-medium text-blue-900">Update Available</span>
                                                                                </div>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={dismissUpdate}
                                                                                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                                                                                >
                                                                                    <X className="h-4 w-4" />
                                                                                </Button>
                                                                            </div>
                                                                            <p className="text-xs text-blue-700 mb-3">A new version is available with improvements and bug fixes.</p>
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => {
                                                                                    void updateApp();
                                                                                    setIsMenuOpen(false);
                                                                                    setMenuActive(null);
                                                                                }}
                                                                                className="w-full"
                                                                            >
                                                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                                                Update Now
                                                                            </Button>
                                                                        </div>
                                                                    )}

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
                                                )
                                            : null
                                    }
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
                                                        <p className="text-sm text-destructive">Name cannot be blank.</p>
                                                    )}
                                                </div>

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
                                                                    onChange={e => setQuery(e.target.value)}
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
                                                                    {selectedUsers.map(username => (
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
                                                                                onClick={() => removeSelectedUser(username)}
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
        </>
    );
}
