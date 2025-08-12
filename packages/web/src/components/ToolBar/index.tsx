'use client';

import { ArrowLeft, CheckCheck, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
import { RippleButton } from '@/components/ui/ripple';

interface ToolBarProps {
    handleAdd: (name: string) => Promise<void>;
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

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [error, setError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const isItemsPage = location.pathname.includes('/list/');

    useEffect(() => {
        if (isDrawerOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 150);
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
        await handleAdd(newName.trim());
        setNewName('');
        setError(false);
        setIsDrawerOpen(false);
    };

    const handleCancel = () => {
        setNewName('');
        setError(false);
        setIsDrawerOpen(false);
    };

    return (
        <>
            <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
                <div className="mx-auto max-w-[500px]">
                    <Card className="shadow-lg">
                        <CardContent className="flex items-center justify-between">
                            {/* Add Button - Always on the left */}
                            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                                <DrawerTrigger asChild>
                                    <RippleButton
                                        size="icon"
                                        className="h-12 w-12 rounded-lg border-2 border-primary/20 hover:border-primary/40 transition-colors"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </RippleButton>
                                </DrawerTrigger>
                                <DrawerContent>
                                    <div className="mx-auto w-full max-w-sm">
                                        <DrawerHeader>
                                            <DrawerTitle>Add New Item</DrawerTitle>
                                        </DrawerHeader>
                                        <div className="p-2 pb-0">
                                            <div className="space-y-2">
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
                                        </div>
                                        <DrawerFooter>
                                            <Button onClick={handleSubmit}>
                                                Add Item
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
                                    className="h-12 w-12 rounded-lg border-2 border-border hover:border-primary/40 transition-colors"
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
                                    className="h-12 w-12 rounded-lg border-2 border-border hover:border-primary/40 transition-colors"
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
                                    className="h-12 w-12 rounded-lg border-2 border-destructive/20 hover:border-destructive/40 text-destructive hover:text-destructive transition-colors"
                                    rippleClassName="bg-red-500/30"
                                    title="Delete all items"
                                    onClick={handleRemoveAll}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </RippleButton>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
