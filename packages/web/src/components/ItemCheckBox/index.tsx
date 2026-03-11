import { getStorageItem } from '@igor-siergiej/web-utils';
import type { Item, ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { differenceInHours, format } from 'date-fns';
import {
    AlertCircle,
    AlertTriangle,
    Calendar as CalendarIcon,
    Check,
    Edit2,
    ImageOff,
    Loader2,
    Trash2,
} from 'lucide-react';
import { motion, useAnimation, useMotionValue } from 'motion/react';
import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteItem, updateItem, updateItemDueDate, updateItemName, updateItemQuantity } from '../../api';
import { getAuthConfig } from '../../config/auth';

export interface ItemCheckBoxProps {
    item: Item;
    listTitle: string;
    listType: ListType;
}

const ItemCheckBox = ({ item, listTitle, listType }: ItemCheckBoxProps) => {
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [drawerEditValue, setDrawerEditValue] = useState('');
    const [drawerQuantityValue, setDrawerQuantityValue] = useState('');
    const [drawerUnitValue, setDrawerUnitValue] = useState('');
    const [drawerDueDateValue, setDrawerDueDateValue] = useState<Date | undefined>(undefined);
    const [swipeState, setSwipeState] = useState<'closed' | 'left' | 'right'>('closed');
    const [isDeleting, setIsDeleting] = useState(false);
    const [hasLoadedImage, setHasLoadedImage] = useState(false);
    const [hasImageError, setHasImageError] = useState(false);
    const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);

    const drawerInputRef = useRef<HTMLInputElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const x = useMotionValue(0);
    const controls = useAnimation();

    const queryClient = useQueryClient();

    // Fetch image with proper authorization header
    useEffect(() => {
        let isMounted = true;
        let currentBlobUrl: string | null = null;

        const fetchImage = async () => {
            try {
                const authConfig = getAuthConfig();
                const accessToken = getStorageItem(
                    authConfig.accessTokenKey || 'accessToken',
                    authConfig.storageType || 'localStorage'
                );

                const headers: Record<string, string> = {};
                if (accessToken) {
                    headers.Authorization = `Bearer ${accessToken}`;
                }

                const response = await fetch(`/api/image/${encodeURIComponent(item.name)}`, {
                    method: 'GET',
                    headers,
                });

                if (!isMounted) return;

                if (!response.ok) {
                    if (isMounted) {
                        setHasImageError(true);
                    }
                    return;
                }

                const blob = await response.blob();
                currentBlobUrl = URL.createObjectURL(blob);
                if (isMounted) {
                    setImageBlobUrl(currentBlobUrl);
                }
            } catch (_error) {
                // Image fetch failed - component will show error fallback
                if (isMounted) {
                    setHasImageError(true);
                }
            }
        };

        void fetchImage();

        return () => {
            isMounted = false;
            // Revoke blob URL to free memory
            if (currentBlobUrl) {
                URL.revokeObjectURL(currentBlobUrl);
            }
        };
    }, [item.name]);

    // Mutation for toggling item selection
    const toggleMutation = useMutation({
        mutationFn: (isSelected: boolean) => updateItem(item.name, isSelected, listTitle),
        onMutate: async (isSelected) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries([listTitle]);

            // Snapshot previous value
            const previousData = queryClient.getQueryData<{ listType: ListType; items: Item[] }>([listTitle]);

            // Optimistically update cache
            queryClient.setQueryData<{ listType: ListType; items: Item[] }>([listTitle], (old) =>
                old
                    ? { ...old, items: old.items.map((i) => (i.name === item.name ? { ...i, isSelected } : i)) }
                    : undefined
            );

            return { previousData };
        },
        onError: (_err, _isSelected, context) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueryData([listTitle], context.previousData);
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
            const previousData = queryClient.getQueryData<{ listType: ListType; items: Item[] }>([listTitle]);

            // Optimistically remove item
            queryClient.setQueryData<{ listType: ListType; items: Item[] }>([listTitle], (old) =>
                old ? { ...old, items: old.items.filter((i) => i.name !== item.name) } : undefined
            );

            return { previousData };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData([listTitle], context.previousData);
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
            const previousData = queryClient.getQueryData<{ listType: ListType; items: Item[] }>([listTitle]);

            // Optimistically update item name
            queryClient.setQueryData<{ listType: ListType; items: Item[] }>([listTitle], (old) =>
                old
                    ? { ...old, items: old.items.map((i) => (i.name === item.name ? { ...i, name: newName } : i)) }
                    : undefined
            );

            return { previousData };
        },
        onError: (_err, _newName, context) => {
            if (context?.previousData) {
                queryClient.setQueryData([listTitle], context.previousData);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries([listTitle]);
        },
    });

    // Mutation for updating item quantity
    const updateQuantityMutation = useMutation({
        mutationFn: ({ quantity, unit }: { quantity?: number; unit?: string }) =>
            updateItemQuantity(listTitle, item.name, quantity, unit),
        onMutate: async ({ quantity, unit }) => {
            await queryClient.cancelQueries([listTitle]);
            const previousData = queryClient.getQueryData<{ listType: ListType; items: Item[] }>([listTitle]);

            // Optimistically update item quantity/unit
            queryClient.setQueryData<{ listType: ListType; items: Item[] }>([listTitle], (old) =>
                old
                    ? {
                          ...old,
                          items: old.items.map((i) =>
                              i.name === item.name
                                  ? {
                                        ...i,
                                        ...(quantity !== undefined && { quantity }),
                                        ...(unit !== undefined && { unit }),
                                    }
                                  : i
                          ),
                      }
                    : undefined
            );

            return { previousData };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData([listTitle], context.previousData);
            }
        },
        onSettled: () => {
            void queryClient.invalidateQueries([listTitle]);
        },
    });

    // Mutation for updating item due date
    const updateDueDateMutation = useMutation({
        mutationFn: (dueDate?: Date) => updateItemDueDate(listTitle, item.name, dueDate),
        onMutate: async (dueDate) => {
            await queryClient.cancelQueries([listTitle]);
            const previousData = queryClient.getQueryData<{ listType: ListType; items: Item[] }>([listTitle]);

            // Optimistically update item due date
            queryClient.setQueryData<{ listType: ListType; items: Item[] }>([listTitle], (old) =>
                old
                    ? {
                          ...old,
                          items: old.items.map((i) =>
                              i.name === item.name
                                  ? {
                                        ...i,
                                        ...(dueDate !== undefined && { dueDate }),
                                    }
                                  : i
                          ),
                      }
                    : undefined
            );

            return { previousData };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData([listTitle], context.previousData);
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
        setDrawerQuantityValue(item.quantity?.toString() ?? '');
        setDrawerUnitValue(item.unit ?? '');
        if (item.dueDate instanceof Date) {
            setDrawerDueDateValue(item.dueDate);
        } else if (typeof item.dueDate === 'string') {
            setDrawerDueDateValue(new Date(item.dueDate));
        } else {
            setDrawerDueDateValue(undefined);
        }
        setIsEditDrawerOpen(true);

        // Auto-focus input after drawer animation
        setTimeout(() => {
            drawerInputRef.current?.focus();
        }, 250);
    };

    const handleDrawerEditSave = () => {
        const hasNameChange = drawerEditValue.trim() && drawerEditValue !== item.name;
        const newQuantity = drawerQuantityValue.trim() ? parseFloat(drawerQuantityValue) : undefined;
        const newUnit = drawerUnitValue.trim() || undefined;
        const hasQuantityChange = newQuantity !== item.quantity || newUnit !== item.unit;

        const hasDueDateChange =
            drawerDueDateValue?.toDateString() !==
            (item.dueDate instanceof Date ? item.dueDate.toDateString() : undefined);

        if (hasNameChange) {
            updateNameMutation.mutate(drawerEditValue.trim());
        }

        if (hasQuantityChange) {
            updateQuantityMutation.mutate({ quantity: newQuantity, unit: newUnit });
        }

        if (hasDueDateChange && listType === ListTypeEnum.TODO) {
            updateDueDateMutation.mutate(drawerDueDateValue);
        }

        setIsEditDrawerOpen(false);
        setDrawerEditValue('');
        setDrawerQuantityValue('');
        setDrawerUnitValue('');
        setDrawerDueDateValue(undefined);
    };

    const handleDrawerEditCancel = () => {
        setIsEditDrawerOpen(false);
        setDrawerEditValue('');
        setDrawerQuantityValue('');
        setDrawerUnitValue('');
        setDrawerDueDateValue(undefined);
    };

    // Reset image loading state when blob URL changes
    useEffect(() => {
        setHasLoadedImage(false);
        // Don't reset error state here - let the image load handler manage it
    }, []);

    const handleToggleSelected = async () => {
        if (toggleMutation.isLoading || swipeState !== 'closed') return;

        const next = !item.isSelected;
        toggleMutation.mutate(next);
    };

    const handleDragEnd = (_event: PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) => {
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
                onClick={(e) => {
                    // Don't close if clicking on a button (let button handle its own click)
                    const target = e.target as HTMLElement;
                    if (target.closest('button')) {
                        return;
                    }

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
                                {/* Checkbox/Image display - TODO lists show square checkbox, shopping lists show image */}
                                {listType === ListTypeEnum.TODO ? (
                                    // Square checkbox for TODO items
                                    <div className="relative h-12 w-12 shrink-0 flex items-center justify-center">
                                        <div
                                            className={`h-6 w-6 rounded border-2 flex items-center justify-center transition-all ${
                                                item.isSelected
                                                    ? 'bg-primary border-primary'
                                                    : 'border-muted-foreground hover:border-primary'
                                            }`}
                                        >
                                            {item.isSelected && <Check className="h-4 w-4 text-white" />}
                                        </div>
                                        {toggleMutation.isLoading && (
                                            <motion.div
                                                className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            </motion.div>
                                        )}
                                    </div>
                                ) : (
                                    // Circular image for shopping items
                                    <div className="relative h-12 w-12 shrink-0">
                                        {/* Image */}
                                        {imageBlobUrl && (
                                            <img
                                                ref={imageRef}
                                                src={imageBlobUrl}
                                                alt={item.name}
                                                className={`h-12 w-12 rounded-full object-cover border ${hasLoadedImage && !hasImageError ? 'opacity-100' : 'opacity-0'}`}
                                                onLoad={() => setHasLoadedImage(true)}
                                                onError={() => setHasImageError(true)}
                                            />
                                        )}

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
                                )}

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

                            {/* Quantity badge for shopping lists */}
                            {listType === ListTypeEnum.SHOPPING && item.quantity !== undefined && item.unit && (
                                <div className="flex items-center justify-center px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 ml-2 shrink-0">
                                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                                        {item.quantity} {item.unit}
                                    </span>
                                </div>
                            )}

                            {/* Due date badge for TODO lists */}
                            {listType === ListTypeEnum.TODO &&
                                item.dueDate &&
                                (() => {
                                    const dueDate =
                                        item.dueDate instanceof Date ? item.dueDate : new Date(item.dueDate);
                                    const hoursUntilDue = differenceInHours(dueDate, new Date());
                                    const isAlertRed = hoursUntilDue < 24;
                                    const isWarningYellow = hoursUntilDue < 72 && !isAlertRed;

                                    return (
                                        <div
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ml-2 shrink-0 ${
                                                isAlertRed
                                                    ? 'bg-red-100 text-red-800 border-red-300'
                                                    : isWarningYellow
                                                      ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                                      : ''
                                            }`}
                                        >
                                            {isAlertRed && <AlertCircle className="h-4 w-4" />}
                                            {isWarningYellow && <AlertTriangle className="h-4 w-4" />}
                                            <span className="text-sm font-semibold whitespace-nowrap">
                                                {format(dueDate, 'dd/MM/yyyy')}
                                            </span>
                                        </div>
                                    );
                                })()}
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Edit Item Drawer */}
            <Drawer open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
                <DrawerContent>
                    <div className="mx-auto w-full max-w-sm">
                        <DrawerHeader>
                            <DrawerTitle>Edit Item</DrawerTitle>
                        </DrawerHeader>
                        <div>
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

                        {/* Quantity and Unit fields for shopping lists */}
                        {listType === ListTypeEnum.SHOPPING && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="edit-item-quantity">Quantity</Label>
                                    <Input
                                        id="edit-item-quantity"
                                        type="number"
                                        value={drawerQuantityValue}
                                        onChange={(e) => setDrawerQuantityValue(e.target.value)}
                                        placeholder="e.g., 2"
                                        className="mt-2"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="edit-item-unit">Unit</Label>
                                    <Select value={drawerUnitValue} onValueChange={setDrawerUnitValue}>
                                        <SelectTrigger id="edit-item-unit" className="mt-2">
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

                        {/* Due Date field for TODO lists */}
                        {listType === ListTypeEnum.TODO && (
                            <div className="space-y-2">
                                <Label>Due Date (Optional)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            data-empty={!drawerDueDateValue}
                                            className="data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal h-10"
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {drawerDueDateValue
                                                ? format(drawerDueDateValue, 'dd/MM/yyyy')
                                                : 'Pick a date'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-fit overflow-visible p-4 max-w-xs"
                                        align="start"
                                        side="top"
                                        sideOffset={4}
                                    >
                                        <div style={{ '--cell-size': '3.5rem' } as React.CSSProperties}>
                                            <Calendar
                                                mode="single"
                                                selected={drawerDueDateValue}
                                                onSelect={setDrawerDueDateValue}
                                            />
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}
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
                    </div>
                </DrawerContent>
            </Drawer>
        </motion.div>
    );
};

export default ItemCheckBox;
