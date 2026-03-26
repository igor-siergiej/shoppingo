import type { Ingredient } from '@shoppingo/types';
import { ImageOff } from 'lucide-react';
import { Skeleton } from '../../components/ui/skeleton';
import { useItemImage } from '../../hooks/useItemImage';

interface IngredientSelectRowProps {
    ingredient: Ingredient;
    isSelected: boolean;
    onToggle: (id: string) => void;
}

export const IngredientSelectRow = ({ ingredient, isSelected, onToggle }: IngredientSelectRowProps) => {
    const { imageBlobUrl, hasLoadedImage, hasImageError, onImageLoad, onImageError } = useItemImage(ingredient.name);

    return (
        <button
            type="button"
            onClick={() => onToggle(ingredient.id)}
            className={`flex items-center gap-4 p-3 rounded-lg border transition-all text-left w-full ${
                isSelected
                    ? 'bg-primary/10 border-primary/20 text-foreground'
                    : 'bg-muted/30 border-muted-foreground/20 text-muted-foreground line-through'
            }`}
        >
            <div className="relative h-12 w-12 shrink-0">
                {imageBlobUrl && (
                    <img
                        src={imageBlobUrl}
                        alt={ingredient.name}
                        className={`h-12 w-12 rounded-full object-cover border ${hasLoadedImage && !hasImageError ? 'opacity-100' : 'opacity-0'}`}
                        onLoad={onImageLoad}
                        onError={onImageError}
                    />
                )}

                {!hasLoadedImage && !hasImageError && (
                    <Skeleton className="absolute inset-0 h-12 w-12 rounded-full border" />
                )}

                {hasImageError && (
                    <div className="absolute inset-0 h-12 w-12 rounded-full border flex items-center justify-center bg-muted/20 text-muted-foreground">
                        <ImageOff className="h-5 w-5" />
                    </div>
                )}
            </div>

            <div>
                <div className="font-medium">{ingredient.name}</div>
                {(ingredient.quantity !== undefined || ingredient.unit) && (
                    <div className="text-sm mt-1">
                        {ingredient.quantity} {ingredient.unit}
                    </div>
                )}
            </div>
        </button>
    );
};
