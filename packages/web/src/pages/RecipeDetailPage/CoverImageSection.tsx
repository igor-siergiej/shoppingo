'use client';

import type { Recipe } from '@shoppingo/types';
import { ImageOff, Loader2, Trash2, Upload, Wand2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { deleteCoverImageKey } from '../../api';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';
import { logger } from '../../utils/logger';

interface CoverImageSectionProps {
    recipe: Recipe;
    isOwner: boolean;
    onImageUpdate: (imageKey: string) => Promise<void>;
    onImageDelete: () => Promise<void>;
}

export const CoverImageSection = ({ recipe, isOwner, onImageUpdate, onImageDelete }: CoverImageSectionProps) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoadingImage, setIsLoadingImage] = useState(true);
    const [hasImageError, setHasImageError] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [descriptionInput, setDescriptionInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const descriptionInputId = useId();

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

    const handleFileSelect = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                },
            });
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/images/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload image');
            }

            const data = (await response.json()) as { key: string };
            await onImageUpdate(data.key);

            toast.success('Cover image updated', {
                style: {
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                },
            });

            logger.info('Recipe cover image uploaded', {
                recipeId: recipe.id,
                fileName: file.name,
            });
        } catch (error) {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to upload image', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                },
            });
            logger.error('Failed to upload recipe cover image', {
                recipeId: recipe.id,
                error: err.message,
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleGenerateImage = async () => {
        if (!descriptionInput.trim()) {
            toast.error('Please enter a description', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                },
            });
            return;
        }

        setIsGenerating(true);
        try {
            const response = await fetch('/api/images/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: descriptionInput,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate image');
            }

            const data = (await response.json()) as { key: string };
            await onImageUpdate(data.key);
            setDescriptionInput('');

            toast.success('Cover image generated', {
                style: {
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                },
            });

            logger.info('Recipe cover image generated', {
                recipeId: recipe.id,
                description: descriptionInput,
            });
        } catch (error) {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to generate image', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                },
            });
            logger.error('Failed to generate recipe cover image', {
                recipeId: recipe.id,
                error: err.message,
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteDialog(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            await deleteCoverImageKey(recipe.id);
            await onImageDelete();
            setShowDeleteDialog(false);

            toast.success('Cover image removed', {
                style: {
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                },
            });

            logger.info('Recipe cover image deleted', {
                recipeId: recipe.id,
            });
        } catch (error) {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to delete image', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                },
            });
            logger.error('Failed to delete recipe cover image', {
                recipeId: recipe.id,
                error: err.message,
            });
        }
    };

    return (
        <>
            <div className="space-y-3">
                <h3 className="text-lg font-semibold">Cover Image</h3>

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

                {isOwner && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => {
                                        const file = e.currentTarget.files?.[0];
                                        if (file) {
                                            void handleFileSelect(file);
                                        }
                                    }}
                                    className="hidden"
                                    disabled={isUploading || isGenerating}
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading || isGenerating}
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload Image
                                        </>
                                    )}
                                </Button>
                            </div>

                            {imageUrl && !hasImageError && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full text-destructive hover:text-destructive"
                                    onClick={handleDeleteClick}
                                    disabled={isUploading || isGenerating}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </Button>
                            )}
                        </div>

                        <div className="space-y-2 border rounded-md p-4 bg-muted/30">
                            <label htmlFor={descriptionInputId} className="text-sm font-medium text-muted-foreground">
                                Generate with AI
                            </label>
                            <input
                                id={descriptionInputId}
                                type="text"
                                placeholder="Describe the image..."
                                value={descriptionInput}
                                onChange={(e) => setDescriptionInput(e.currentTarget.value)}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                                disabled={isUploading || isGenerating}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        void handleGenerateImage();
                                    }
                                }}
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => void handleGenerateImage()}
                                disabled={isUploading || isGenerating || !descriptionInput.trim()}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="h-4 w-4 mr-2" />
                                        Generate Image
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Cover Image?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the cover image? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void handleDeleteConfirm()}>Delete Image</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
