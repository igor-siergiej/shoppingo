import type { Ingredient } from '@shoppingo/types';
import { Edit2, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { type MouseEvent, useId, useRef, useState } from 'react';
import { QuantityUnitField } from '../../components/QuantityUnitField';
import { Button } from '../../components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '../../components/ui/drawer';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

export interface IngredientItemProps {
    ingredient: Ingredient;
    onDelete: (id: string) => void;
    onEdit: (id: string, updated: Ingredient) => void;
    isOwner?: boolean;
}

const IngredientItemActionButtons = ({
    isDeleting,
    isLoading,
    onDelete,
    onEdit,
}: {
    isDeleting: boolean;
    isLoading: boolean;
    onDelete: (e?: MouseEvent) => void;
    onEdit: (e?: MouseEvent) => void;
}) => {
    if (isDeleting) return null;

    return (
        <>
            <div className="absolute inset-y-0 right-0 flex items-center justify-end w-32">
                <Button
                    onClick={onDelete}
                    disabled={isLoading}
                    className="h-[calc(100%-2px)] w-full rounded-lg bg-destructive hover:bg-destructive/90 text-white border border-destructive/20 shadow-sm flex items-center justify-end mr-1"
                >
                    <div className="flex items-center justify-center pr-3.5">
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 size={20} />}
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

const IngredientItem = ({ ingredient, onDelete, onEdit, isOwner = true }: IngredientItemProps) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const drawerInputRef = useRef<HTMLInputElement>(null);
    const ingredientNameId = useId();
    const ingredientQuantityId = useId();
    const ingredientUnitId = useId();

    const { x, controls, swipeState, handleDragEnd, closeSwipe } = useSwipeGesture();

    const [editedName, setEditedName] = useState(ingredient.name);
    const [editedQuantity, setEditedQuantity] = useState(String(ingredient.quantity || ''));
    const [editedUnit, setEditedUnit] = useState(ingredient.unit || '');

    const handleDeleteClick = async (e?: MouseEvent) => {
        e?.stopPropagation();
        setIsDeleting(true);
        setIsLoading(true);
        onDelete(ingredient.id);
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
        const quantity = editedQuantity.trim() ? parseFloat(editedQuantity) : undefined;
        const unit = editedUnit.trim() || undefined;

        onEdit(ingredient.id, {
            ...ingredient,
            name,
            quantity,
            unit,
        });

        setIsLoading(false);
        setIsDrawerOpen(false);
    };

    if (!isOwner) {
        return (
            <div className="p-3 rounded-lg bg-muted/20 border border-border">
                <p className="font-medium">{ingredient.name}</p>
                {(ingredient.quantity || ingredient.unit) && (
                    <p className="text-sm text-muted-foreground">
                        {ingredient.quantity} {ingredient.unit}
                    </p>
                )}
            </div>
        );
    }

    return (
        <>
            <motion.div
                layout
                className="relative mb-2 rounded-lg overflow-hidden"
                initial={{ opacity: 1, scale: 1, height: 'auto' }}
                animate={
                    isDeleting
                        ? { opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }
                        : { opacity: 1, scale: 1, height: 'auto' }
                }
                transition={{
                    duration: 0.35,
                    ease: [0.4, 0, 0.2, 1],
                    layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                }}
            >
                <IngredientItemActionButtons
                    isDeleting={isDeleting}
                    isLoading={isLoading}
                    onDelete={handleDeleteClick}
                    onEdit={handleEditClick}
                />

                <motion.div
                    drag={!isLoading ? 'x' : false}
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
                    <div className="p-3 rounded-lg border border-border">
                        <p className="font-medium">{ingredient.name}</p>
                        {(ingredient.quantity || ingredient.unit) && (
                            <p className="text-sm text-muted-foreground">
                                {ingredient.quantity} {ingredient.unit}
                            </p>
                        )}
                    </div>
                </motion.div>
            </motion.div>

            <Drawer open={isDrawerOpen} onOpenChange={(open) => !open && setIsDrawerOpen(false)}>
                <DrawerContent>
                    <div className="mx-auto w-full max-w-sm">
                        <DrawerHeader>
                            <DrawerTitle>Edit Ingredient</DrawerTitle>
                        </DrawerHeader>
                        <div className="p-4 space-y-4">
                            <div>
                                <Label htmlFor={ingredientNameId}>Ingredient Name</Label>
                                <Input
                                    id={ingredientNameId}
                                    ref={drawerInputRef}
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    placeholder="Enter ingredient name"
                                    className="mt-2"
                                />
                            </div>

                            <QuantityUnitField
                                quantity={editedQuantity}
                                unit={editedUnit}
                                onQuantityChange={setEditedQuantity}
                                onUnitChange={setEditedUnit}
                                quantityId={ingredientQuantityId}
                                unitId={ingredientUnitId}
                            />
                        </div>
                        <DrawerFooter>
                            <Button onClick={handleDrawerSave} disabled={!editedName.trim()}>
                                Save Changes
                            </Button>
                            <DrawerClose asChild>
                                <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
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

export default IngredientItem;
