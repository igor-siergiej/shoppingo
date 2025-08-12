'use client';

import { ArrowLeft, CheckCheck, Home, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useMeasure from 'react-use-measure';

import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import useClickOutside from '../../hooks/useClickOutside';

const transition = {
    type: 'spring' as const,
    bounce: 0.1,
    duration: 0.25,
};

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
    const [active, setActive] = useState<number | null>(null);
    const [contentRef, { height: heightContent }] = useMeasure();
    const [menuRef, { width: widthContainer }] = useMeasure();
    const ref = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [maxWidth, setMaxWidth] = useState(0);

    // Drawer state
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [error, setError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const isItemsPage = location.pathname.includes('/list/');

    useClickOutside(ref, () => {
        setIsOpen(false);
        setActive(null);
    });

    useEffect(() => {
        if (!widthContainer || maxWidth > 0) return;
        setMaxWidth(widthContainer);
    }, [widthContainer, maxWidth]);

    useEffect(() => {
        if (isDrawerOpen && inputRef.current) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
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

    const ITEMS = [
        ...(handleClearSelected || handleRemoveAll
            ? [{
                    id: 1,
                    label: 'Clear Actions',
                    title: <Trash2 className="h-5 w-5" />,
                    content: (
                        <div className="flex flex-col space-y-6">
                            <div className="text-foreground text-center">Clear items from the list.</div>
                            <div className="flex flex-col space-y-3">
                                {handleClearSelected && (
                                    <button
                                        className="relative h-10 w-full scale-100 select-none appearance-none items-center justify-center rounded-lg border border-border bg-background px-4 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                                        type="button"
                                        onClick={() => {
                                            handleClearSelected();
                                            setIsOpen(false);
                                            setActive(null);
                                        }}
                                    >
                                        <div className="flex items-center justify-center">
                                            <CheckCheck className="h-4 w-4 mr-2" />
                                            <span>Clear Selected</span>
                                        </div>
                                    </button>
                                )}
                                {handleRemoveAll && (
                                    <button
                                        className="relative h-10 w-full scale-100 select-none appearance-none items-center justify-center rounded-lg border border-destructive/20 bg-background px-4 text-sm text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                                        type="button"
                                        onClick={() => {
                                            handleRemoveAll();
                                            setIsOpen(false);
                                            setActive(null);
                                        }}
                                    >
                                        <div className="flex items-center justify-center">
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            <span>Clear All</span>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    ),
                }]
            : []),
    ];

    return (
        <>
            <MotionConfig transition={transition}>
                <div className="fixed bottom-4 left-0 right-0 z-40 px-4" ref={ref}>
                    <div className="mx-auto max-w-[500px]">
                        <div className="rounded-xl border border-border bg-background shadow-lg">
                            <div className="overflow-hidden">
                                <AnimatePresence initial={false} mode="sync">
                                    {isOpen
                                        ? (
                                                <motion.div
                                                    key="content"
                                                    initial={{ height: 0 }}
                                                    animate={{ height: heightContent || 0 }}
                                                    exit={{ height: 0 }}
                                                    style={{
                                                        width: maxWidth,
                                                    }}
                                                >
                                                    <div ref={contentRef} className="p-2">
                                                        {ITEMS.map((item) => {
                                                            const isSelected = active === item.id;

                                                            return (
                                                                <motion.div
                                                                    key={item.id}
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: isSelected ? 1 : 0 }}
                                                                    exit={{ opacity: 0 }}
                                                                >
                                                                    <div
                                                                        className={cn(
                                                                            'px-2 pt-2 text-sm',
                                                                            isSelected ? 'block' : 'hidden'
                                                                        )}
                                                                    >
                                                                        {item.content}
                                                                    </div>
                                                                </motion.div>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )
                                        : null}
                                </AnimatePresence>
                            </div>
                            <div className="flex items-center justify-between p-2" ref={menuRef}>
                                {/* Add Button - Direct Action */}
                                <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                                    <DrawerTrigger asChild>
                                        <button
                                            className="relative flex h-12 w-12 shrink-0 scale-100 select-none appearance-none items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                                            type="button"
                                        >
                                            <Plus className="h-5 w-5" />
                                        </button>
                                    </DrawerTrigger>
                                    <DrawerContent>
                                        <div className="mx-auto w-full max-w-sm">
                                            <DrawerHeader>
                                                <DrawerTitle>Add New Item</DrawerTitle>
                                                <DrawerDescription>
                                                    Enter the name of the item you want to add to your list.
                                                </DrawerDescription>
                                            </DrawerHeader>
                                            <div className="p-4 pb-0">
                                                <div className="space-y-2">
                                                    <Label htmlFor="new-item">Item Name</Label>
                                                    <Input
                                                        id="new-item"
                                                        ref={inputRef}
                                                        value={newName}
                                                        autoComplete="off"
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

                                {/* Back/Home Button - Direct Action */}
                                <button
                                    className="relative flex h-12 w-12 shrink-0 scale-100 select-none appearance-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                                    type="button"
                                    onClick={() => {
                                        if (isItemsPage && handleGoBack) {
                                            handleGoBack();
                                        } else {
                                            navigate('/');
                                        }
                                    }}
                                >
                                    {isItemsPage && handleGoBack
                                        ? <ArrowLeft className="h-5 w-5" />
                                        : <Home className="h-5 w-5" />}
                                </button>

                                {/* Expandable Clear Actions */}
                                {ITEMS.length > 0 && (
                                    <button
                                        aria-label="Clear Actions"
                                        className={cn(
                                            'relative flex h-12 w-12 shrink-0 scale-100 select-none appearance-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]',
                                            active === 1 ? 'bg-accent text-accent-foreground' : ''
                                        )}
                                        type="button"
                                        onClick={() => {
                                            if (!isOpen) setIsOpen(true);
                                            if (active === 1) {
                                                setIsOpen(false);
                                                setActive(null);
                                                return;
                                            }

                                            setActive(1);
                                        }}
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </MotionConfig>
        </>
    );
}
