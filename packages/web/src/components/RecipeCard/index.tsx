import { getStorageItem } from '@imapps/web-utils';
import type { Recipe } from '@shoppingo/types';
import { ImageOff, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { getAuthConfig } from '../../config/auth';

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
                const authConfig = getAuthConfig();
                const token = getStorageItem(
                    authConfig.accessTokenKey || 'accessToken',
                    authConfig.storageType || 'localStorage'
                );

                const headers: Record<string, string> = {};
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }

                const response = await fetch(`/api/image/${encodeURIComponent(recipe.coverImageKey)}`, {
                    headers,
                });
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
            className="group cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-105 h-full flex flex-col relative z-10 origin-center"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <div className="relative flex-1 w-full overflow-hidden bg-muted rounded-t-lg">
                {imageUrl && !hasImageError && (
                    <img
                        src={imageUrl}
                        alt={recipe.title}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
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
