import { getStorageItem } from '@imapps/web-utils';
import type { Recipe } from '@shoppingo/types';
import { ImageIcon, ImageOff } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadRecipeImage } from '../../api';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { getAuthConfig } from '../../config/auth';

interface CoverImageSectionProps {
    recipe: Recipe;
    isOwner?: boolean;
    onImageChange?: () => void;
}

export const CoverImageSection = ({ recipe, isOwner = false, onImageChange }: CoverImageSectionProps) => {
    const fileInputId = useId();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageUrlRef = useRef<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoadingImage, setIsLoadingImage] = useState(true);
    const [hasImageError, setHasImageError] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (!recipe.coverImageKey) {
            setIsLoadingImage(false);
            return;
        }

        setIsLoadingImage(true);

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
                imageUrlRef.current = url;
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
            if (imageUrlRef.current) {
                URL.revokeObjectURL(imageUrlRef.current);
                imageUrlRef.current = null;
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

    return (
        <div className="relative h-64 w-full rounded-md overflow-hidden bg-muted border flex items-center justify-center">
            {imageUrl && !hasImageError && (
                <img src={imageUrl} alt={recipe.title} className="h-full w-full object-cover" />
            )}

            {(isLoadingImage || !recipe.coverImageKey) && !imageUrl && !hasImageError && (
                <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
            )}

            {hasImageError && (
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImageOff className="h-8 w-8" />
                    <p className="text-sm">Failed to load image</p>
                </div>
            )}

            {!recipe.coverImageKey && isOwner && (
                <div className="absolute bottom-3 right-3 z-10">
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
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        <ImageIcon className="h-4 w-4 mr-1" />
                        Upload
                    </Button>
                </div>
            )}
        </div>
    );
};
