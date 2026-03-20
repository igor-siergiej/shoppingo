import type { Recipe } from '@shoppingo/types';
import { ImageOff, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CoverImageSectionProps {
    recipe: Recipe;
}

export const CoverImageSection = ({ recipe }: CoverImageSectionProps) => {
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
                setHasImageError(false);
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

    return (
        <div className="h-64 w-full rounded-md overflow-hidden bg-muted border flex items-center justify-center">
            {imageUrl && !hasImageError && (
                <img src={imageUrl} alt={recipe.title} className="h-full w-full object-cover" />
            )}

            {isLoadingImage && !imageUrl && (
                <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading image...</p>
                </div>
            )}

            {hasImageError && (
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImageOff className="h-8 w-8" />
                    <p className="text-sm">Failed to load image</p>
                </div>
            )}

            {!imageUrl && !isLoadingImage && !hasImageError && (
                <div className="flex flex-col items-center justify-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                        <span className="text-3xl">🍳</span>
                    </div>
                    <p className="text-sm text-muted-foreground">No cover image</p>
                </div>
            )}
        </div>
    );
};
