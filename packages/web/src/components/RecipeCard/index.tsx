import type { Recipe } from '@shoppingo/types';
import { ImageOff, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';

interface RecipeCardProps {
    recipe: Recipe;
    onClick: () => void;
}

export const RecipeCard = ({ recipe, onClick }: RecipeCardProps) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoadingImage, setIsLoadingImage] = useState(true);
    const [hasImageError, setHasImageError] = useState(false);

    useEffect(() => {
        if (!recipe.coverImageKey) {
            setIsLoadingImage(false);
            return;
        }

        const fetchImage = async () => {
            try {
                const response = await fetch(`/api/images/${recipe.coverImageKey}`);
                if (!response.ok) {
                    setHasImageError(true);
                    return;
                }
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                setImageUrl(url);
            } catch {
                setHasImageError(true);
            } finally {
                setIsLoadingImage(false);
            }
        };

        fetchImage();

        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [recipe.coverImageKey, imageUrl]);

    const ingredientCount = recipe.ingredients?.length ?? 0;
    const ingredientLabel = ingredientCount === 1 ? 'ingredient' : 'ingredients';

    return (
        <Card
            role="button"
            onClick={onClick}
            className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md hover:scale-[1.02] h-full flex flex-col"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    onClick();
                }
            }}
        >
            <div className="relative h-40 w-full overflow-hidden bg-muted">
                {imageUrl && !hasImageError && (
                    <img src={imageUrl} alt={recipe.title} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                )}

                {isLoadingImage && !imageUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                {hasImageError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/20 text-muted-foreground">
                        <ImageOff className="h-8 w-8" />
                    </div>
                )}

                {!imageUrl && !isLoadingImage && !hasImageError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/40 to-muted/60">
                        <div className="text-center">
                            <div className="h-10 w-10 mx-auto rounded-full bg-muted-foreground/20 flex items-center justify-center">
                                <span className="text-2xl">🍳</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <CardContent className="flex-1 p-3 flex flex-col justify-between">
                <div>
                    <h3 className="font-semibold text-base line-clamp-2 text-foreground mb-2 group-hover:text-primary transition-colors">{recipe.title}</h3>
                </div>
                <div className="inline-block">
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                        {ingredientCount} {ingredientLabel}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
};
