import type { Item } from '@shoppingo/types';
import { Check, Edit2, ImageOff, Loader2, Minus, Plus, Trash2, X as XIcon } from 'lucide-react';
import { motion, useAnimation, useMotionValue } from 'motion/react';
import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

import { deleteItem, updateItem, updateItemName } from '../../api';

export interface ItemCheckBoxProps {
    item: Item;
    listTitle: string;
    refetch: () => void;
}

const ItemCheckBox = ({ item, listTitle, refetch }: ItemCheckBoxProps) => {
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);
    const [isToggleLoading, setIsToggleLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [swipeState, setSwipeState] = useState<'closed' | 'left' | 'right'>('closed');
    const [isDeleting, setIsDeleting] = useState(false);

    const x = useMotionValue(0);
    const controls = useAnimation();

    const handleDeleteItem = async (e?: MouseEvent) => {
        e?.stopPropagation();
        setIsDeleteLoading(true);
        setIsDeleting(true);

        // Animate card out
        await controls.start({
            opacity: 0,
            x: -400,
            transition: { duration: 0.3 },
        });

        await deleteItem(item.name, listTitle);
        refetch();
        setIsDeleteLoading(false);
    };

    const handleEditStart = (e?: MouseEvent) => {
        e?.stopPropagation();
        setSwipeState('closed');
        void controls.start({ x: 0 });
        setIsEditing(true);
        setEditValue(item.name);
    };

    const handleEditSave = async () => {
        if (editValue.trim() && editValue !== item.name) {
            try {
                await updateItemName(listTitle, item.name, editValue.trim());
                refetch();
            } catch (error) {
                console.error('Error updating item name:', error);
            }
        }

        setIsEditing(false);
        setEditValue('');
    };

    const handleEditCancel = () => {
        setIsEditing(false);
        setEditValue('');
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
    }, []);

    const handleToggleSelected = async () => {
        if (isEditing || isDeleteLoading || isToggleLoading || swipeState !== 'closed') return;
        setIsToggleLoading(true);
        try {
            const next = !item.isSelected;

            await updateItem(item.name, next, listTitle);
            refetch();
        } finally {
            setIsToggleLoading(false);
        }
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
            className="relative mb-2 rounded-lg overflow-hidden"
            animate={isDeleting ? { opacity: 0, x: -100, height: 0, marginBottom: 0 } : { opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
            {/* Action buttons underneath - Delete on right (revealed by swiping left) */}
            {!isEditing && (
                <div className="absolute inset-y-0 right-0 flex items-center justify-end w-32">
                    <Button
                        onClick={handleDeleteItem}
                        disabled={isDeleteLoading}
                        className="h-full w-full rounded-lg bg-destructive hover:bg-destructive/90 text-white border border-destructive/20 shadow-sm flex items-center justify-end mr-1"
                    >
                        <div className="flex items-center justify-center pr-3.5">
                            {isDeleteLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 size={20} />}
                        </div>
                    </Button>
                </div>
            )}

            {/* Action buttons underneath - Edit on left (revealed by swiping right) */}
            {!isEditing && (
                <div className="absolute inset-y-0 left-0 flex items-center justify-start pl-1 w-32">
                    <Button
                        onClick={handleEditStart}
                        className="h-full w-full rounded-lg bg-blue-500 hover:bg-blue-600 text-white border border-blue-600/20 shadow-sm flex items-center"
                    >
                        <div className="flex items-center justify-center pr-10">
                            <Edit2 size={20} />
                        </div>
                    </Button>
                </div>
            )}

            {/* Draggable card */}
            <motion.div
                drag={!isEditing && !isDeleteLoading ? 'x' : false}
                dragConstraints={{ left: -80, right: 80 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{ x }}
                className="relative"
                onClick={() => {
                    // Tap card when open to close it
                    if (swipeState !== 'closed') {
                        closeSwipe();
                    }
                }}
            >
                <Card
                    key={item.name}
                    className={`transition-all rounded-lg duration-200 py-0.5 px-1 ${
                        item.isSelected
                            ? 'bg-primary/10 border-primary/20 shadow-md'
                            : 'bg-background hover:bg-accent/50'
                    } ${isEditing ? '' : swipeState === 'closed' ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${isDeleting ? 'pointer-events-none' : ''}`}
                    onClick={() => void handleToggleSelected()}
                    onClickCapture={(e) => {
                        const target = e.target as HTMLElement;

                        if (target.closest('button') || target.closest('input, textarea')) {
                            return;
                        }
                        // Allow bubbling onClick to handle the toggle
                    }}
                    role="button"
                    aria-pressed={item.isSelected}
                    aria-busy={isToggleLoading}
                    tabIndex={isEditing ? -1 : 0}
                    onKeyDown={(e) => {
                        if (isEditing) return;
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
                            {!isEditing && (
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
                                    {isToggleLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                        </div>
                                    )}

                                    {/* Error fallback icon */}
                                    {hasImageError && (
                                        <div className="absolute inset-0 h-12 w-12 rounded-full border flex items-center justify-center bg-muted/20 text-muted-foreground">
                                            <ImageOff className="h-5 w-5" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {isEditing ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <Input
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleEditSave();
                                            }

                                            if (e.key === 'Escape') {
                                                handleEditCancel();
                                            }
                                        }}
                                        className="flex-1"
                                        autoFocus
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleEditSave}
                                        className="h-8 w-8 text-green-600 hover:bg-green-50"
                                    >
                                        <Check size={16} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleEditCancel}
                                        className="h-8 w-8 text-gray-500 hover:bg-gray-50"
                                    >
                                        <XIcon size={16} />
                                    </Button>
                                </div>
                            ) : (
                                <Label
                                    className={`flex-1 cursor-pointer text-base ${
                                        item.isSelected ? 'line-through text-muted-foreground' : 'text-foreground'
                                    }`}
                                >
                                    {item.name}
                                </Label>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
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
