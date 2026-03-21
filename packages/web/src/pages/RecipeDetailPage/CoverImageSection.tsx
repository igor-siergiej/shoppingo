import { getStorageItem } from '@imapps/web-utils';
import type { Recipe } from '@shoppingo/types';
import { ImageIcon, ImageOff, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { setCoverImageKey, uploadRecipeImage } from '../../api';
import { getAuthConfig } from '../../config/auth';
import { Button } from '../../components/ui/button';

interface CoverImageSectionProps {
    recipe: Recipe;
    isOwner?: boolean;
    onImageChange?: () => void;
}

export const CoverImageSection = ({ recipe, isOwner = false }: CoverImageSectionProps) => {
    const fileInputId = useId();
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
    }, [recipe.coverImageKey]);

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            await uploadRecipeImage(recipe.id, file);
            toast.success('Image uploaded successfully', { style: { backgroundColor: '#10b981', color: '#ffffff' } });
            // Refresh the image by triggering onImageChange
            if (onImageChange) {
                onImageChange();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to upload image';
            toast.error(message, { style: { backgroundColor: '#ef4444', color: '#ffffff' } });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAiGenerate = async () => {
        setIsUploading(true);
        try {
            // Trigger AI generation via existing endpoint
            await fetch(`/api/image/${encodeURIComponent(recipe.title)}`, {
                method: 'GET',
            });
            // Set the imageKey to the normalized title
            await setCoverImageKey(recipe.id, recipe.title.trim().toLowerCase());
            toast.success('Image generated successfully', { style: { backgroundColor: '#10b981', color: '#ffffff' } });
            // Refresh the image
            if (onImageChange) {
                onImageChange();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to generate image';
            toast.error(message, { style: { backgroundColor: '#ef4444', color: '#ffffff' } });
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
                                id={fileInputId}
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
                                onClick={handleAiGenerate}
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
