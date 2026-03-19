import type { Item, ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { differenceInHours, format } from 'date-fns';
import { AlertCircle, AlertTriangle, Check, Edit2, ImageOff, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { type MouseEvent, useId, useRef, useState } from 'react';
import { DueDateField } from '@/components/DueDateField';
import { QuantityUnitField } from '@/components/QuantityUnitField';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useItemImage } from '../../hooks/useItemImage';
import { useItemMutations } from '../../hooks/useItemMutations';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

export interface ItemCheckBoxProps {
    item: Item;
    listTitle: string;
    listType: ListType;
}

const normaliseDueDate = (d: Date | string | undefined): Date | undefined => {
    if (d instanceof Date) return d;
    if (typeof d === 'string') return new Date(d);
    return undefined;
};

const DueDateBadge = ({ dueDate }: { dueDate: Date | string | undefined }) => {
    if (!dueDate) return null;

    const date = dueDate instanceof Date ? dueDate : new Date(dueDate);
    const hoursUntilDue = differenceInHours(date, new Date());
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
            <span className="text-sm font-semibold whitespace-nowrap">{format(date, 'dd/MM/yyyy')}</span>
        </div>
    );
};

interface ItemCheckBoxActionButtonsProps {
    isDeleting: boolean;
    deleteMutation: { isLoading: boolean };
    onDelete: (e?: MouseEvent) => void;
    onEdit: (e?: MouseEvent) => void;
}

const ItemCheckBoxActionButtons = ({
    isDeleting,
    deleteMutation,
    onDelete,
    onEdit,
}: ItemCheckBoxActionButtonsProps) => {
    if (isDeleting) return null;

    return (
        <>
            {/* Delete button on right */}
            <div className="absolute inset-y-0 right-0 flex items-center justify-end w-32">
                <Button
                    onClick={onDelete}
                    disabled={deleteMutation.isLoading}
                    className="h-[calc(100%-2px)] w-full rounded-lg bg-destructive hover:bg-destructive/90 text-white border border-destructive/20 shadow-sm flex items-center justify-end mr-1"
                >
                    <div className="flex items-center justify-center pr-3.5">
                        {deleteMutation.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 size={20} />}
                    </div>
                </Button>
            </div>

            {/* Edit button on left */}
            <div className="absolute inset-y-0 left-0 flex items-center justify-start pl-1 w-32">
                <Button
                    onClick={onEdit}
                    className="h-[calc(100%-2px)] w-full rounded-lg bg-blue-500 hover:bg-blue-600 text-white border border-blue-600/20 shadow-sm flex items-center"
                >
                    <div className="flex items-center justify-center pr-10">
                        <Edit2 size={20} />
                    </div>
                </Button>
            </div>
        </>
    );
};

interface ItemIconProps {
    item: Item;
    listType: ListType;
    imageBlobUrl: string | null;
    hasLoadedImage: boolean;
    hasImageError: boolean;
    isLoading: boolean;
    onImageLoad: () => void;
    onImageError: () => void;
}

const ItemIcon = ({
    item,
    listType,
    imageBlobUrl,
    hasLoadedImage,
    hasImageError,
    isLoading,
    onImageLoad,
    onImageError,
}: ItemIconProps) => {
    if (listType === ListTypeEnum.TODO) {
        return (
            <div className="relative h-12 w-12 shrink-0 flex items-center justify-center">
                <div
                    className={`h-6 w-6 rounded border-2 flex items-center justify-center transition-all ${
                        item.isSelected ? 'bg-primary border-primary' : 'border-muted-foreground hover:border-primary'
                    }`}
                >
                    {item.isSelected && <Check className="h-4 w-4 text-white" />}
                </div>
                {isLoading && (
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
        );
    }

    return (
        <div className="relative h-12 w-12 shrink-0">
            {imageBlobUrl && (
                <img
                    src={imageBlobUrl}
                    alt={item.name}
                    className={`h-12 w-12 rounded-full object-cover border ${hasLoadedImage && !hasImageError ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={onImageLoad}
                    onError={onImageError}
                />
            )}

            {!hasLoadedImage && !hasImageError && (
                <Skeleton className="absolute inset-0 h-12 w-12 rounded-full border" />
            )}

            {isLoading && (
                <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                >
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </motion.div>
            )}

            {hasImageError && (
                <div className="absolute inset-0 h-12 w-12 rounded-full border flex items-center justify-center bg-muted/20 text-muted-foreground">
                    <ImageOff className="h-5 w-5" />
                </div>
            )}
        </div>
    );
};

const ItemCheckBox = ({ item, listTitle, listType }: ItemCheckBoxProps) => {
    const editItemNameId = useId();
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [drawerEditValue, setDrawerEditValue] = useState('');
    const [drawerQuantityValue, setDrawerQuantityValue] = useState('');
    const [drawerUnitValue, setDrawerUnitValue] = useState('');
    const [drawerDueDateValue, setDrawerDueDateValue] = useState<Date | undefined>(undefined);
    const [isDeleting, setIsDeleting] = useState(false);

    const drawerInputRef = useRef<HTMLInputElement>(null);

    const { imageBlobUrl, hasLoadedImage, hasImageError, onImageLoad, onImageError } = useItemImage(item.name);
    const { x, controls, swipeState, handleDragEnd, closeSwipe } = useSwipeGesture();
    const { toggleMutation, deleteMutation, updateNameMutation, updateQuantityMutation, updateDueDateMutation } =
        useItemMutations(listTitle, item.name);

    const handleDeleteItem = async (e?: MouseEvent) => {
        e?.stopPropagation();

        setIsDeleting(true);
        deleteMutation.mutate();
    };

    const handleEditStart = (e?: MouseEvent) => {
        e?.stopPropagation();
        closeSwipe();
        void controls.start({ x: 0 });
        setDrawerEditValue(item.name);
        setDrawerQuantityValue(item.quantity?.toString() ?? '');
        setDrawerUnitValue(item.unit ?? '');
        setDrawerDueDateValue(normaliseDueDate(item.dueDate));
        setIsEditDrawerOpen(true);

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

    const handleToggleSelected = async () => {
        if (toggleMutation.isLoading || swipeState !== 'closed') return;

        const next = !item.isSelected;
        toggleMutation.mutate(next);
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
            <ItemCheckBoxActionButtons
                isDeleting={isDeleting}
                deleteMutation={deleteMutation}
                onDelete={handleDeleteItem}
                onEdit={handleEditStart}
            />

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
                                <ItemIcon
                                    item={item}
                                    listType={listType}
                                    imageBlobUrl={imageBlobUrl}
                                    hasLoadedImage={hasLoadedImage}
                                    hasImageError={hasImageError}
                                    isLoading={toggleMutation.isLoading}
                                    onImageLoad={onImageLoad}
                                    onImageError={onImageError}
                                />

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
                            {listType === ListTypeEnum.TODO && <DueDateBadge dueDate={item.dueDate} />}
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
                            <Label htmlFor={editItemNameId}>Item Name</Label>
                            <Input
                                id={editItemNameId}
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
                            <QuantityUnitField
                                quantity={drawerQuantityValue}
                                unit={drawerUnitValue}
                                onQuantityChange={setDrawerQuantityValue}
                                onUnitChange={setDrawerUnitValue}
                                quantityId="edit-item-quantity"
                                unitId="edit-item-unit"
                            />
                        )}

                        {/* Due Date field for TODO lists */}
                        {listType === ListTypeEnum.TODO && (
                            <DueDateField value={drawerDueDateValue} onChange={setDrawerDueDateValue} />
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
