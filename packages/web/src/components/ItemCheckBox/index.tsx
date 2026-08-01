import type { Item, ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { motion } from 'motion/react';
import { type MouseEvent, useId, useRef, useState } from 'react';
import { useItemEditDrawer } from '../../hooks/useItemEditDrawer';
import { useItemImage } from '../../hooks/useItemImage';
import { useItemMutations } from '../../hooks/useItemMutations';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { EditNameQuantityDrawer } from '../EditNameQuantityDrawer';
import { SwipeableRow } from '../SwipeableRow';
import { ItemCheckBoxCard } from './ItemCheckBoxCard';

interface ItemCheckBoxProps {
    item: Item;
    listTitle: string;
    listType: ListType;
}

const hasNameChanged = (item: Item, name: string): boolean => Boolean(name.trim()) && name !== item.name;

const resolveQuantityChange = (
    item: Item,
    quantity: string,
    unit: string
): { hasChange: boolean; newQuantity?: number; newUnit?: string } => {
    const newQuantity = quantity.trim() ? parseFloat(quantity) : undefined;
    const newUnit = unit.trim() || undefined;
    return { hasChange: newQuantity !== item.quantity || newUnit !== item.unit, newQuantity, newUnit };
};

const ItemCheckBox = ({ item, listTitle, listType }: ItemCheckBoxProps) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const drawerInputRef = useRef<HTMLInputElement>(null);
    const itemNameId = useId();
    const itemQuantityId = useId();
    const itemUnitId = useId();

    const { imageBlobUrl, hasLoadedImage, hasImageError, onImageLoad, onImageError } = useItemImage(item.name);
    const { x, controls, swipeState, handleDragEnd, closeSwipe } = useSwipeGesture();
    const { toggleMutation, deleteMutation, updateNameMutation, updateQuantityMutation } = useItemMutations(
        listTitle,
        item.id
    );
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
        drawerState.openDrawer({ name: item.name, quantity: item.quantity, unit: item.unit });
        setTimeout(() => {
            drawerInputRef.current?.focus();
        }, 250);
    };

    const handleToggleSelected = async () => {
        if (toggleMutation.isLoading || swipeState !== 'closed') return;
        toggleMutation.mutate(!item.isSelected);
    };

    const handleDrawerSave = () => {
        const { name, quantity, unit } = drawerState.values;
        const { hasChange: hasQuantityChange, newQuantity, newUnit } = resolveQuantityChange(item, quantity, unit);

        if (hasNameChanged(item, name)) updateNameMutation.mutate(name.trim());
        if (hasQuantityChange) updateQuantityMutation.mutate({ quantity: newQuantity, unit: newUnit });

        drawerState.closeDrawer();
    };

    return (
        <>
            <SwipeableRow
                isDeleting={isDeleting}
                isDeleteLoading={deleteMutation.isLoading}
                isDragDisabled={deleteMutation.isLoading}
                swipeState={swipeState}
                x={x}
                controls={controls}
                scale={item.isSelected ? 0.97 : 1}
                onDragEnd={handleDragEnd}
                closeSwipe={closeSwipe}
                onDelete={handleDeleteItem}
                onEdit={handleEditStart}
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
            </SwipeableRow>

            <EditNameQuantityDrawer
                open={drawerState.isOpen}
                onOpenChange={(open) => !open && drawerState.closeDrawer()}
                title="Edit Item"
                nameLabel="Item Name"
                namePlaceholder="Enter item name"
                nameId={itemNameId}
                nameInputRef={drawerInputRef}
                name={drawerState.values.name}
                onNameChange={drawerState.updateName}
                showQuantityUnit={listType === ListTypeEnum.SHOPPING}
                quantity={drawerState.values.quantity}
                unit={drawerState.values.unit}
                onQuantityChange={drawerState.updateQuantity}
                onUnitChange={drawerState.updateUnit}
                quantityId={itemQuantityId}
                unitId={itemUnitId}
                onSave={handleDrawerSave}
                saveDisabled={!drawerState.values.name.trim()}
            />
        </>
    );
};

export default ItemCheckBox;
