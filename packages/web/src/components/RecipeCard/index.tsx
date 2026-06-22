import type { Recipe } from '@shoppingo/types';
import { ImageOff } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuthedImage } from '../../hooks/useAuthedImage';

interface RecipeCardProps {
    recipe: Recipe;
    onClick: () => void;
}

export const RecipeCard = ({ recipe, onClick }: RecipeCardProps) => {
    const { imageUrl, hasError: hasImageError } = useAuthedImage(recipe.coverImageKey);

    const ingredientCount = recipe.ingredients?.length ?? 0;
    const ingredientLabel = ingredientCount === 1 ? 'ingredient' : 'ingredients';

    return (
        <Card
            role="button"
            onClick={onClick}
            className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-105 h-full flex flex-col relative z-10 origin-center"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <div className="relative flex-1 w-full overflow-hidden bg-muted rounded-t-lg min-h-40">
                {imageUrl && !hasImageError && (
                    <img
                        src={imageUrl}
                        alt={recipe.title}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                )}

                {!imageUrl && !hasImageError && <Skeleton className="absolute inset-0 h-full w-full rounded-none" />}

                {hasImageError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/20 text-muted-foreground">
                        <ImageOff className="h-8 w-8" />
                    </div>
                )}
            </div>

            <CardContent className="px-2 py-1.5 flex flex-col gap-1">
                <h3 className="font-semibold text-sm line-clamp-1 text-foreground group-hover:text-primary transition-colors">
                    {recipe.title}
                </h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded w-fit">
                    {ingredientCount} {ingredientLabel}
                </span>
            </CardContent>
        </Card>
    );
};
