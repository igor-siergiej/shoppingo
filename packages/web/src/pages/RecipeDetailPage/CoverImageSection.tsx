import type { Recipe } from '@shoppingo/types';
import { ImageOff, Loader2, ImageIcon, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';

interface CoverImageSectionProps {
    recipe: Recipe;
    isOwner?: boolean;
    onImageChange?: (imageKey: string) => void;
}

export const CoverImageSection = ({ recipe, isOwner = false, onImageChange }: CoverImageSectionProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoadingImage, setIsLoadingImage] = useState(true);
    const [hasImageError, setHasImageError] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

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

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // TODO: Implement image upload to backend
            // For now, create a local preview
            const reader = new FileReader();
            reader.onload = (event) => {
                setImageUrl(event.target?.result as string);
                // TODO: Call onImageChange with uploaded image key
            };
            reader.readAsDataURL(file);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="relative h-64 w-full rounded-md overflow-hidden bg-muted border flex items-center justify-center">
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
                <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                        <span className="text-3xl">🍳</span>
                    </div>
                    <p className="text-sm text-muted-foreground">No cover image</p>
                    {isOwner && (
                        <div className="flex gap-2 mt-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                disabled={isUploading}
                                className="hidden"
                                id="recipe-image-upload"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                <ImageIcon className="h-4 w-4 mr-1" />
                                Upload
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isUploading}
                            >
                                <Sparkles className="h-4 w-4 mr-1" />
                                AI Generate
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
