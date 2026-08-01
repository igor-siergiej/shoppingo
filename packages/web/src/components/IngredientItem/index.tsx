import type { Ingredient } from '@shoppingo/types';
import { type MouseEvent, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { QuantityBadge } from '../../components/ItemCheckBox/QuantityBadge';
import { useItemImage } from '../../hooks/useItemImage';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { EditNameQuantityDrawer } from '../EditNameQuantityDrawer';
import { ItemAvatar } from '../ItemAvatar';
import { SwipeableRow } from '../SwipeableRow';

interface IngredientItemProps {
    ingredient: Ingredient;
    onDelete: (id: string) => void;
    onEdit: (id: string, updated: Ingredient) => void;
    isOwner?: boolean;
}

const IngredientItem = ({ ingredient, onDelete, onEdit, isOwner = true }: IngredientItemProps) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const drawerInputRef = useRef<HTMLInputElement>(null);
    const ingredientNameId = useId();
    const ingredientQuantityId = useId();
    const ingredientUnitId = useId();

    const { imageBlobUrl, hasLoadedImage, hasImageError, onImageLoad, onImageError } = useItemImage(ingredient.name);
    const { x, controls, swipeState, handleDragEnd, closeSwipe } = useSwipeGesture();

    const [editedName, setEditedName] = useState(ingredient.name);
    const [editedQuantity, setEditedQuantity] = useState(String(ingredient.quantity || ''));
    const [editedUnit, setEditedUnit] = useState(ingredient.unit || '');

    const handleDeleteClick = async (e?: MouseEvent) => {
        e?.stopPropagation();
        setIsDeleting(true);
        setIsLoading(true);
        try {
            await onDelete(ingredient.id);
            toast.success('Ingredient deleted', {
                style: { backgroundColor: '#10b981', color: '#ffffff', border: 'none' },
            });
        } catch (error) {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to delete ingredient', {
                style: { backgroundColor: '#ef4444', color: '#ffffff', border: 'none' },
            });
            setIsDeleting(false);
            setIsLoading(false);
        }
    };

    const handleEditClick = (e?: MouseEvent) => {
        e?.stopPropagation();
        closeSwipe();
        void controls.start({ x: 0 });
        setEditedName(ingredient.name);
        setEditedQuantity(String(ingredient.quantity || ''));
        setEditedUnit(ingredient.unit || '');
        setIsDrawerOpen(true);
        setTimeout(() => {
            drawerInputRef.current?.focus();
        }, 250);
    };

    const handleDrawerSave = () => {
        const name = editedName.trim();
        if (!name) return;

        setIsLoading(true);
        onEdit(ingredient.id, {
            ...ingredient,
            name,
            quantity: editedQuantity.trim() ? parseFloat(editedQuantity) : undefined,
            unit: editedUnit.trim() || undefined,
        });
        setIsLoading(false);
        setIsDrawerOpen(false);
    };

    const avatarAndLabel = (
        <>
            <ItemAvatar
                name={ingredient.name}
                imageBlobUrl={imageBlobUrl}
                hasLoadedImage={hasLoadedImage}
                hasImageError={hasImageError}
                onImageLoad={onImageLoad}
                onImageError={onImageError}
            />
            <p className="font-medium flex-1">{ingredient.name}</p>
            <QuantityBadge quantity={ingredient.quantity} unit={ingredient.unit} />
        </>
    );

    if (!isOwner) {
        return (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border min-h-[60px]">
                {avatarAndLabel}
            </div>
        );
    }

    return (
        <>
            <SwipeableRow
                isDeleting={isDeleting}
                isDeleteLoading={isLoading}
                isDragDisabled={isLoading}
                swipeState={swipeState}
                x={x}
                controls={controls}
                onDragEnd={handleDragEnd}
                closeSwipe={closeSwipe}
                onDelete={handleDeleteClick}
                onEdit={handleEditClick}
            >
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border min-h-[60px]">
                    {avatarAndLabel}
                </div>
            </SwipeableRow>

            <EditNameQuantityDrawer
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                title="Edit Ingredient"
                nameLabel="Ingredient Name"
                namePlaceholder="Enter ingredient name"
                nameId={ingredientNameId}
                nameInputRef={drawerInputRef}
                name={editedName}
                onNameChange={setEditedName}
                showQuantityUnit
                quantity={editedQuantity}
                unit={editedUnit}
                onQuantityChange={setEditedQuantity}
                onUnitChange={setEditedUnit}
                quantityId={ingredientQuantityId}
                unitId={ingredientUnitId}
                onSave={handleDrawerSave}
                saveDisabled={!editedName.trim()}
            />
        </>
    );
};

export default IngredientItem;
