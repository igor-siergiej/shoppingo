import { ListType } from '@shoppingo/types';
import { Edit2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ItemCheckBoxCard } from '../../components/ItemCheckBox/ItemCheckBoxCard';
import { useItemImage } from '../../hooks/useItemImage';
import { SWIPE_REVEAL_DISTANCE, useSwipeGesture } from '../../hooks/useSwipeGesture';
import type { Ingredient } from './IngredientsField';

export interface DraftIngredientRowProps {
    ingredient: Ingredient;
    onEdit: () => void;
    onDelete: () => void;
}

const noop = () => {};

// Swipe-reveal edit/delete shell for draft (not-yet-persisted) recipe ingredients: reuses
// the shopping list's ItemCheckBoxCard for the image/name/quantity presentation (same feel,
// same image lookup by name) but edit/delete are local callbacks, not useItemMutations —
// recipe ingredients are draft-only local state until the whole recipe is submitted.
export const DraftIngredientRow = ({ ingredient, onEdit, onDelete }: DraftIngredientRowProps) => {
    const { x, controls, swipeState, handleDragEnd, closeSwipe } = useSwipeGesture();
    const { imageBlobUrl, hasLoadedImage, hasImageError, onImageLoad, onImageError } = useItemImage(ingredient.name);

    return (
        <div className="relative rounded-lg overflow-hidden">
            <div className="absolute inset-y-0 right-0 flex items-center justify-end w-20">
                <button
                    type="button"
                    onClick={onDelete}
                    aria-label={`Delete ${ingredient.name}`}
                    className="h-[calc(100%-2px)] w-full rounded-lg bg-destructive hover:bg-destructive/90 text-white flex items-center justify-center mr-1"
                >
                    <Trash2 size={20} />
                </button>
            </div>
            <div className="absolute inset-y-0 left-0 flex items-center justify-start pl-1 w-20">
                <button
                    type="button"
                    onClick={onEdit}
                    aria-label={`Edit ${ingredient.name}`}
                    className="h-[calc(100%-2px)] w-full rounded-lg bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center"
                >
                    <Edit2 size={20} />
                </button>
            </div>

            <motion.div
                drag="x"
                dragConstraints={{ left: -SWIPE_REVEAL_DISTANCE, right: SWIPE_REVEAL_DISTANCE }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{ x }}
                className="relative z-10"
                onClick={() => swipeState !== 'closed' && closeSwipe()}
            >
                <ItemCheckBoxCard
                    item={ingredient}
                    listType={ListType.SHOPPING}
                    imageBlobUrl={imageBlobUrl}
                    hasLoadedImage={hasLoadedImage}
                    hasImageError={hasImageError}
                    isLoading={false}
                    isSelected={false}
                    onToggle={noop}
                    onImageLoad={onImageLoad}
                    onImageError={onImageError}
                />
            </motion.div>
        </div>
    );
};
