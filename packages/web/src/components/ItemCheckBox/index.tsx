import type { Item } from '@shoppingo/types';
import { Check, Edit2, ImageOff, Loader2, Minus, Plus, Trash2, X as XIcon } from 'lucide-react';
import { motion, useAnimation, useMotionValue } from 'motion/react';
import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

import { deleteItem, updateItem, updateItemName } from '../../api';

export interface ItemCheckBoxProps {
    item: Item;
    listTitle: string;
}

const ItemCheckBox = ({ item, listTitle }: ItemCheckBoxProps) => {
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [drawerEditValue, setDrawerEditValue] = useState('');
    const [swipeState, setSwipeState] = useState<'closed' | 'left' | 'right'>('closed');
    const [isDeleting, setIsDeleting] = useState(false);

    const x = useMotionValue(0);
    const controls = useAnimation();
    const queryClient = useQueryClient();
    const drawerInputRef = useRef<HTMLInputElement>(null);

    // Mutation for toggling item selection
    const toggleMutation = useMutation({
        mutationFn: (isSelected: boolean) => updateItem(item.name, isSelected, listTitle),
        onMutate: async (isSelected) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries([listTitle]);

            // Snapshot previous value
            const previousItems = queryClient.getQueryData<Item[]>([listTitle]);

            // Optimistically update cache
            queryClient.setQueryData<Item[]>([listTitle], (old) =>
                old ? old.map((i) => (i.name === item.name ? { ...i, isSelected } : i)) : []
            );

            return { previousItems };
        },
        onError: (_err, _isSelected, context) => {
            // Rollback on error
            if (context?.previousItems) {
                queryClient.setQueryData([listTitle], context.previousItems);
            }
        },
        onSettled: () => {
            // Refetch to ensure consistency
            void queryClient.invalidateQueries([listTitle]);
        },
    });

    // Mutation for deleting item
    const deleteMutation = useMutation({
        mutationFn: () => deleteItem(item.name, listTitle),
        onMutate: async () => {
            await queryClient.cancelQueries([listTitle]);
            const previousItems = queryClient.getQueryData<Item[]>([listTitle]);

            // Optimistically remove item
            queryClient.setQueryData<Item[]>([listTitle], (old) =>
                old ? old.filter((i) => i.name !== item.name) : []
            );

            return { previousItems };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousItems) {
                queryClient.setQueryData([listTitle], context.previousItems);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries([listTitle]);
        },
    });

    // Mutation for updating item name
    const updateNameMutation = useMutation({
        mutationFn: (newName: string) => updateItemName(listTitle, item.name, newName),
        onMutate: async (newName) => {
            await queryClient.cancelQueries([listTitle]);
            const previousItems = queryClient.getQueryData<Item[]>([listTitle]);

            // Optimistically update item name
            queryClient.setQueryData<Item[]>([listTitle], (old) =>
                old ? old.map((i) => (i.name === item.name ? { ...i, name: newName } : i)) : []
            );

            return { previousItems };
        },
        onError: (_err, _newName, context) => {
            if (context?.previousItems) {
                queryClient.setQueryData([listTitle], context.previousItems);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries([listTitle]);
        },
    });

    const handleDeleteItem = async (e?: MouseEvent) => {
        e?.stopPropagation();

        // Immediately close swipe and start delete animation
        setSwipeState('closed');
        setIsDeleting(true);

        // Delete the item - the animation will play while this happens
        deleteMutation.mutate();
    };

    const handleEditStart = (e?: MouseEvent) => {
        e?.stopPropagation();
        setSwipeState('closed');
        void controls.start({ x: 0 });
        setDrawerEditValue(item.name);
        setIsEditDrawerOpen(true);

        // Auto-focus input after drawer animation
        setTimeout(() => {
            drawerInputRef.current?.focus();
        }, 250);
    };

    const handleDrawerEditSave = () => {
        if (drawerEditValue.trim() && drawerEditValue !== item.name) {
            updateNameMutation.mutate(drawerEditValue.trim());
        }
        setIsEditDrawerOpen(false);
        setDrawerEditValue('');
    };

    const handleDrawerEditCancel = () => {
        setIsEditDrawerOpen(false);
        setDrawerEditValue('');
    };

    const imageSrc = useMemo(() => `/api/image/${encodeURIComponent(item.name)}`, [item.name]);
    const [hasLoadedImage, setHasLoadedImage] = useState(false);
    const [hasImageError, setHasImageError] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        setHasLoadedImage(false);
        setHasImageError(false);

        const img = imageRef.current;

        // If the image is already in the browser cache, the load event may not fire.
        // Detect that case and set the loaded/error state accordingly.
        if (img?.complete) {
            if (img.naturalWidth > 0) {
                setHasLoadedImage(true);
            } else {
                setHasImageError(true);
            }
        }
    }, [imageSrc]);

    const handleToggleSelected = async () => {
        if (toggleMutation.isLoading || swipeState !== 'closed') return;

        const next = !item.isSelected;
        toggleMutation.mutate(next);
    };

    const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
        const threshold = 60;
        const swipeVelocityThreshold = 500;
        const closeThreshold = 30; // Easier to close - if dragging less than this toward center

        const shouldSwipeLeft = info.offset.x < -threshold || info.velocity.x < -swipeVelocityThreshold;
        const shouldSwipeRight = info.offset.x > threshold || info.velocity.x > swipeVelocityThreshold;

        // If already open and user drags back toward center, close it
        if (swipeState === 'left' && info.offset.x > closeThreshold) {
            setSwipeState('closed');
            void controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        } else if (swipeState === 'right' && info.offset.x < -closeThreshold) {
            setSwipeState('closed');
            void controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        } else if (shouldSwipeLeft && swipeState !== 'left') {
            // Swipe left - reveal delete button
            setSwipeState('left');
            void controls.start({ x: -80, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        } else if (shouldSwipeRight && swipeState !== 'right') {
            // Swipe right - reveal edit button
            setSwipeState('right');
            void controls.start({ x: 80, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        } else if (swipeState !== 'closed' && Math.abs(info.offset.x) < 20) {
            // Tapped while open - close it
            setSwipeState('closed');
            void controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        } else if (swipeState === 'closed') {
            // Not swiped enough - spring back to center
            void controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        } else {
            // Already open - spring back to open position
            const targetX = swipeState === 'left' ? -80 : 80;
            void controls.start({ x: targetX, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        }
    };

    const closeSwipe = () => {
        if (swipeState !== 'closed') {
            setSwipeState('closed');
            void controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
        }
    };

    return (
        <motion.div
            layout
            className="relative mb-2 rounded-lg overflow-hidden"
            initial={{ opacity: 1, scale: 1, height: 'auto' }}
            animate={
                isDeleting
                    ? {
                          opacity: 0,
                          scale: 0.9,
                          height: 0,
                          marginBottom: 0,
                      }
                    : {
                          opacity: 1,
                          scale: item.isSelected ? 0.97 : 1,
                          height: 'auto',
                      }
            }
            transition={{
                duration: 0.35,
                ease: [0.4, 0, 0.2, 1],
                layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
            }}
        >
            {/* Action buttons underneath - Delete on right (revealed by swiping left) */}
            {!isDeleting && (
                <div className="absolute inset-y-0 right-0 flex items-center justify-end w-32">
                    <Button
                        onClick={handleDeleteItem}
                        disabled={deleteMutation.isLoading}
                        className="h-[calc(100%-2px)] w-full rounded-lg bg-destructive hover:bg-destructive/90 text-white border border-destructive/20 shadow-sm flex items-center justify-end mr-1"
                    >
                        <div className="flex items-center justify-center pr-3.5">
                            {deleteMutation.isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Trash2 size={20} />
                            )}
                        </div>
                    </Button>
                </div>
            )}

            {/* Action buttons underneath - Edit on left (revealed by swiping right) */}
            {!isDeleting && (
                <div className="absolute inset-y-0 left-0 flex items-center justify-start pl-1 w-32">
                    <Button
                        onClick={handleEditStart}
                        className="h-[calc(100%-2px)] w-full rounded-lg bg-blue-500 hover:bg-blue-600 text-white border border-blue-600/20 shadow-sm flex items-center"
                    >
                        <div className="flex items-center justify-center pr-10">
                            <Edit2 size={20} />
                        </div>
                    </Button>
                </div>
            )}

            {/* Draggable card */}
            <motion.div
                drag={!deleteMutation.isLoading ? 'x' : false}
                dragConstraints={{ left: -80, right: 80 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{ x }}
                className="relative z-10 bg-background rounded-lg"
                onClick={() => {
                    // Tap card when open to close it
                    if (swipeState !== 'closed') {
                        closeSwipe();
                    }
                }}
            >
                <motion.div
                    animate={{
                        opacity: toggleMutation.isLoading ? 0.5 : 1,
                    }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                    <Card
                        key={item.name}
                        className={`transition-all rounded-lg duration-200 py-0.5 px-1 ${
                            item.isSelected
                                ? 'bg-primary/10 border-primary/20 shadow-md'
                                : 'bg-background hover:bg-accent/50 border-border'
                        } ${swipeState === 'closed' ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${isDeleting || toggleMutation.isLoading ? 'pointer-events-none' : ''}`}
                        onClick={() => void handleToggleSelected()}
                        onClickCapture={(e) => {
                            const target = e.target as HTMLElement;

                            if (target.closest('button')) {
                                return;
                            }
                            // Allow bubbling onClick to handle the toggle
                        }}
                        role="button"
                        aria-pressed={item.isSelected}
                        aria-busy={toggleMutation.isLoading}
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                void handleToggleSelected();
                            }
                            if (e.key === 'Escape' && swipeState !== 'closed') {
                                e.preventDefault();
                                closeSwipe();
                            }
                        }}
                    >
                        <CardContent className="flex items-center justify-between p-0.5">
                            <div className="flex items-center gap-4 flex-1">
                                {/* Item image: single <img> to avoid duplicate requests. Overlays for loading/spinner/error. */}
                                <div className="relative h-12 w-12 shrink-0">
                                    {/* Image */}
                                    <img
                                        ref={imageRef}
                                        src={imageSrc}
                                        alt={item.name}
                                        className={`h-12 w-12 rounded-full object-cover border ${hasLoadedImage && !hasImageError ? 'opacity-100' : 'opacity-0'}`}
                                        onLoad={() => setHasLoadedImage(true)}
                                        onError={() => setHasImageError(true)}
                                    />

                                    {/* Loading skeleton (only before load and no error) */}
                                    {!hasLoadedImage && !hasImageError && (
                                        <Skeleton className="absolute inset-0 h-12 w-12 rounded-full border" />
                                    )}

                                    {/* Toggle spinner overlay */}
                                    {toggleMutation.isLoading && (
                                        <motion.div
                                            className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-full"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                        </motion.div>
                                    )}

                                    {/* Error fallback icon */}
                                    {hasImageError && (
                                        <div className="absolute inset-0 h-12 w-12 rounded-full border flex items-center justify-center bg-muted/20 text-muted-foreground">
                                            <ImageOff className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>

                                <Label
                                    className={`flex-1 cursor-pointer text-base transition-all duration-300 ${
                                        item.isSelected ? 'text-muted-foreground' : 'text-foreground'
                                    }`}
                                >
                                    <span className="relative inline-block">
                                        {item.name}
                                        {item.isSelected && (
                                            <motion.div
                                                className="absolute left-0 right-0 top-1/2 h-[2px] bg-muted-foreground/60"
                                                initial={{ scaleX: 0, originX: 0 }}
                                                animate={{ scaleX: 1 }}
                                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                            />
                                        )}
                                    </span>
                                </Label>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Edit Item Drawer */}
            <Drawer open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Edit Item</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 pb-0">
                        <Label htmlFor="edit-item-name">Item Name</Label>
                        <Input
                            id="edit-item-name"
                            ref={drawerInputRef}
                            value={drawerEditValue}
                            onChange={(e) => setDrawerEditValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleDrawerEditSave();
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleDrawerEditCancel();
                                }
                            }}
                            placeholder="Enter item name"
                            className="mt-2"
                        />
                    </div>
                    <DrawerFooter>
                        <Button onClick={handleDrawerEditSave} disabled={!drawerEditValue.trim()}>
                            Save Changes
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline" onClick={handleDrawerEditCancel}>
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </motion.div>
    );
};

export default ItemCheckBox;

export const test = () => (
    <div className="flex items-center w-full max-w-[130px] border rounded-md mr-0.5">
        {/* Minus Button */}
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-r-none border-r-0">
            <Minus className="h-4 w-4" />
        </Button>

        {/* Number Input (The center component) */}
        <Input
            type="number"
            defaultValue={1}
            className="h-10 w-full text-center focus-visible:ring-0 rounded-none px-0
                   [&::-webkit-outer-spin-button]:appearance-none 
                   [&::-webkit-inner-spin-button]:appearance-none"
            style={{ MozAppearance: 'textfield' }}
        />

        {/* Plus Button */}
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-l-none border-l-0">
            <Plus className="h-4 w-4" />
        </Button>
    </div>
);
