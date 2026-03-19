import type { Item, ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { motion } from 'motion/react';
import { type MouseEvent, useRef, useState } from 'react';
import { Edit2, Loader2, Trash2 } from 'lucide-react';
import { DueDateField } from '../../components/DueDateField';
import { QuantityUnitField } from '../../components/QuantityUnitField';
import { Button } from '../../components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '../../components/ui/drawer';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useItemEditDrawer } from '../../hooks/useItemEditDrawer';
import { useItemImage } from '../../hooks/useItemImage';
import { useItemMutations } from '../../hooks/useItemMutations';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { ItemCheckBoxCard } from './ItemCheckBoxCard';

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

const ItemCheckBox = ({ item, listTitle, listType }: ItemCheckBoxProps) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const drawerInputRef = useRef<HTMLInputElement>(null);

    const { imageBlobUrl, hasLoadedImage, hasImageError, onImageLoad, onImageError } = useItemImage(item.name);
    const { x, controls, swipeState, handleDragEnd, closeSwipe } = useSwipeGesture();
    const { toggleMutation, deleteMutation, updateNameMutation, updateQuantityMutation, updateDueDateMutation } =
        useItemMutations(listTitle, item.name);
    const drawerState = useItemEditDrawer();

    const handleDeleteItem = async (e?: MouseEvent) => {
        e?.stopPropagation();
        setIsDeleting(true);
        deleteMutation.mutate();
    };

    const handleEditStart = (e?: MouseEvent) => {
        e?.stopPropagation();
        closeSwipe();
        void controls.start({ x: 0 });
        drawerState.openDrawer({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            dueDate: normaliseDueDate(item.dueDate),
        });
        setTimeout(() => {
            drawerInputRef.current?.focus();
        }, 250);
    };

    const handleToggleSelected = async () => {
        if (toggleMutation.isLoading || swipeState !== 'closed') return;
        const next = !item.isSelected;
        toggleMutation.mutate(next);
    };

    const handleDrawerSave = () => {
        const { values } = drawerState;
        const hasNameChange = values.name.trim() && values.name !== item.name;
        const newQuantity = values.quantity.trim() ? parseFloat(values.quantity) : undefined;
        const newUnit = values.unit.trim() || undefined;
        const hasQuantityChange = newQuantity !== item.quantity || newUnit !== item.unit;
        const hasDueDateChange = values.dueDate?.toDateString() !== (item.dueDate instanceof Date ? item.dueDate.toDateString() : undefined);

        if (hasNameChange) updateNameMutation.mutate(values.name.trim());
        if (hasQuantityChange) updateQuantityMutation.mutate({ quantity: newQuantity, unit: newUnit });
        if (hasDueDateChange) updateDueDateMutation.mutate(values.dueDate);

        drawerState.closeDrawer();
    };

    return (
        <>
            <motion.div
                layout
                className="relative mb-2 rounded-lg overflow-hidden"
                initial={{ opacity: 1, scale: 1, height: 'auto' }}
                animate={
                    isDeleting
                        ? { opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }
                        : { opacity: 1, scale: item.isSelected ? 0.97 : 1, height: 'auto' }
                }
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1], layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
            >
                <ItemCheckBoxActionButtons isDeleting={isDeleting} deleteMutation={deleteMutation} onDelete={handleDeleteItem} onEdit={handleEditStart} />

                <motion.div
                    drag={!deleteMutation.isLoading ? 'x' : false}
                    dragConstraints={{ left: -80, right: 80 }}
                    dragElastic={0.1}
                    onDragEnd={handleDragEnd}
                    animate={controls}
                    style={{ x }}
                    className="relative z-10 bg-background rounded-lg"
                    onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button')) return;
                        if (swipeState !== 'closed') closeSwipe();
                    }}
                >
                    <motion.div
                        animate={{ opacity: toggleMutation.isLoading ? 0.5 : 1 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                    >
                        <ItemCheckBoxCard
                            item={item}
                            listType={listType}
                            imageBlobUrl={imageBlobUrl}
                            hasLoadedImage={hasLoadedImage}
                            hasImageError={hasImageError}
                            isLoading={toggleMutation.isLoading}
                            isSelected={item.isSelected}
                            onToggle={handleToggleSelected}
                            onImageLoad={onImageLoad}
                            onImageError={onImageError}
                        />
                    </motion.div>
                </motion.div>
            </motion.div>

            <Drawer open={drawerState.isOpen} onOpenChange={(open) => !open && drawerState.closeDrawer()}>
                <DrawerContent>
                    <div className="mx-auto w-full max-w-sm">
                        <DrawerHeader>
                            <DrawerTitle>Edit Item</DrawerTitle>
                        </DrawerHeader>
                        <div className="p-4 space-y-4">
                            <div>
                                <Label htmlFor="edit-item-name">Item Name</Label>
                                <Input
                                    id="edit-item-name"
                                    ref={drawerInputRef}
                                    value={drawerState.values.name}
                                    onChange={(e) => drawerState.updateName(e.target.value)}
                                    placeholder="Enter item name"
                                    className="mt-2"
                                />
                            </div>

                            {listType === ListTypeEnum.SHOPPING && (
                                <QuantityUnitField
                                    quantity={drawerState.values.quantity}
                                    unit={drawerState.values.unit}
                                    onQuantityChange={drawerState.updateQuantity}
                                    onUnitChange={drawerState.updateUnit}
                                    quantityId="edit-item-quantity"
                                    unitId="edit-item-unit"
                                />
                            )}

                            {listType === ListTypeEnum.TODO && (
                                <DueDateField value={drawerState.values.dueDate} onChange={drawerState.updateDueDate} />
                            )}
                        </div>
                        <DrawerFooter>
                            <Button onClick={handleDrawerSave} disabled={!drawerState.values.name.trim()}>
                                Save Changes
                            </Button>
                            <DrawerClose asChild>
                                <Button variant="outline" onClick={() => drawerState.closeDrawer()}>
                                    Cancel
                                </Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </div>
                </DrawerContent>
            </Drawer>
        </>
    );
};

export default ItemCheckBox;
