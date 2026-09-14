import { Edit2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { SWIPE_REVEAL_DISTANCE, useSwipeGesture } from '../../hooks/useSwipeGesture';
import type { Ingredient } from './IngredientsField';

export interface DraftIngredientRowProps {
    ingredient: Ingredient;
    onEdit: () => void;
    onDelete: () => void;
}

const quantityLabel = (ingredient: Ingredient): string =>
    [ingredient.quantity, ingredient.unit].filter((part) => part !== undefined && part !== '').join(' ');

// Mirrors ItemCheckBox's swipe-reveal edit/delete shell, but for draft (not-yet-persisted)
// recipe ingredients: no useItemMutations, no isSelected/image — edit/delete are local callbacks.
export const DraftIngredientRow = ({ ingredient, onEdit, onDelete }: DraftIngredientRowProps) => {
    const { x, controls, swipeState, handleDragEnd, closeSwipe } = useSwipeGesture();
    const label = quantityLabel(ingredient);

    return (
        <div className="relative rounded-md overflow-hidden">
            <div className="absolute inset-y-0 right-0 flex items-center justify-end w-20">
                <button
                    type="button"
                    onClick={onDelete}
                    aria-label={`Delete ${ingredient.name}`}
                    className="h-[calc(100%-2px)] w-full rounded-md bg-destructive hover:bg-destructive/90 text-white flex items-center justify-center mr-1"
                >
                    <Trash2 size={18} />
                </button>
            </div>
            <div className="absolute inset-y-0 left-0 flex items-center justify-start pl-1 w-20">
                <button
                    type="button"
                    onClick={onEdit}
                    aria-label={`Edit ${ingredient.name}`}
                    className="h-[calc(100%-2px)] w-full rounded-md bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center"
                >
                    <Edit2 size={18} />
                </button>
            </div>

            <motion.div
                drag="x"
                dragConstraints={{ left: -SWIPE_REVEAL_DISTANCE, right: SWIPE_REVEAL_DISTANCE }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{ x }}
                className="relative z-10 flex items-center gap-2 px-3 py-3 rounded-md bg-muted border border-border text-sm"
                onClick={() => swipeState !== 'closed' && closeSwipe()}
            >
                <span className="flex-1 text-foreground">{ingredient.name}</span>
                {label && <span className="text-muted-foreground">{label}</span>}
            </motion.div>
        </div>
    );
};
