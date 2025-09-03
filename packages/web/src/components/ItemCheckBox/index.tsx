import { Item } from '@shoppingo/types';
import { Check, Edit2, ImageOff, Loader2, X, X as XIcon } from 'lucide-react';
import { type MouseEvent, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

import { deleteItem, updateItem, updateItemName } from '../../api';

export interface ItemCheckBoxProps {
    item: Item;
    listTitle: string;
    refetch: () => void;
}

const ItemCheckBox = ({ item, listTitle, refetch }: ItemCheckBoxProps) => {
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);
    const [isToggleLoading, setIsToggleLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');

    const handleDeleteItem = async (e?: MouseEvent) => {
        e?.stopPropagation();
        setIsDeleteLoading(true);
        await deleteItem(item.name, listTitle);
        refetch();
        setIsDeleteLoading(false);
    };

    const handleEditStart = (e?: MouseEvent) => {
        e?.stopPropagation();
        setIsEditing(true);
        setEditValue(item.name);
    };

    const handleEditSave = async () => {
        if (editValue.trim() && editValue !== item.name) {
            try {
                await updateItemName(listTitle, item.name, editValue.trim());
                refetch();
            } catch (error) {
                console.error('Error updating item name:', error);
            }
        }

        setIsEditing(false);
        setEditValue('');
    };

    const handleEditCancel = () => {
        setIsEditing(false);
        setEditValue('');
    };

    const imageSrc = useMemo(() => `/api/image/${encodeURIComponent(item.name)}`, [item.name]);
    const [hasLoadedImage, setHasLoadedImage] = useState(false);
    const [hasImageError, setHasImageError] = useState(false);

    useEffect(() => {
        setHasLoadedImage(false);
        setHasImageError(false);
    }, [imageSrc]);

    const handleToggleSelected = async () => {
        if (isEditing || isDeleteLoading || isToggleLoading) return;
        setIsToggleLoading(true);
        try {
            const next = !item.isSelected;

            await updateItem(item.name, next, listTitle);
            await refetch();
        } finally {
            setIsToggleLoading(false);
        }
    };

    return (
        <Card
            key={item.name}
            className={`mb-2 transition-all duration-200 py-0.5 px-3 ${
                item.isSelected
                    ? 'bg-primary/10 border-primary/20 shadow-md'
                    : 'bg-background hover:bg-accent/50'
            } ${isEditing ? '' : 'cursor-pointer'}`}
            onClick={() => void handleToggleSelected()}

            onClickCapture={(e) => {
                const target = e.target as HTMLElement;

                if (target.closest('button') || target.closest('input, textarea')) {
                    return;
                }
                // Allow bubbling onClick to handle the toggle
            }}
            role="button"
            aria-pressed={item.isSelected}
            aria-busy={isToggleLoading}
            tabIndex={isEditing ? -1 : 0}
            onKeyDown={(e) => {
                if (isEditing) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void handleToggleSelected();
                }
            }}
        >
            <CardContent className="flex items-center justify-between p-0.5">
                <div className="flex items-center gap-4 flex-1">

                    {/* Item image: single <img> to avoid duplicate requests. Overlays for loading/spinner/error. */}
                    {!isEditing && (
                        <div className="relative h-12 w-12 shrink-0">
                            {/* Image */}
                            <img
                                src={imageSrc}
                                alt={item.name}
                                className={`h-12 w-12 rounded-full object-cover border ${hasLoadedImage && !hasImageError ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setHasLoadedImage(true)}
                                onError={() => setHasImageError(true)}
                            />

                            {/* Loading skeleton (only before load and no error) */}
                            {!hasLoadedImage && !hasImageError && (
                                <Skeleton className="absolute inset-0 h-12 w-12 rounded-full border" />
                            )}

                            {/* Toggle spinner overlay */}
                            {isToggleLoading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            )}

                            {/* Error fallback icon */}
                            {hasImageError && (
                                <div className="absolute inset-0 h-12 w-12 rounded-full border flex items-center justify-center bg-muted/20 text-muted-foreground">
                                    <ImageOff className="h-5 w-5" />
                                </div>
                            )}
                        </div>
                    )}

                    {isEditing
                        ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <Input
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleEditSave();
                                            }

                                            if (e.key === 'Escape') {
                                                handleEditCancel();
                                            }
                                        }}
                                        className="flex-1"
                                        autoFocus
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleEditStart}
                                        className="h-8 w-8 text-green-600 hover:bg-green-50"
                                    >
                                        <Check size={16} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleEditCancel}
                                        className="h-8 w-8 text-gray-500 hover:bg-gray-50"
                                    >
                                        <XIcon size={16} />
                                    </Button>
                                </div>
                            )
                        : (
                                <Label
                                    className={`flex-1 cursor-pointer text-base ${
                                        item.isSelected
                                            ? 'line-through text-muted-foreground'
                                            : 'text-foreground'
                                    }`}
                                >
                                    {item.name}
                                </Label>
                            )}
                </div>

                <div className="flex items-center">
                    {!isEditing && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleEditStart}
                            className="h-12 w-12 hover:bg-blue-50 hover:text-blue-600"
                        >
                            <Edit2 size={20} strokeWidth={1.75} />
                        </Button>
                    )}
                    {isDeleteLoading
                        ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            )
                        : (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleDeleteItem}
                                    className="h-12 w-12 hover:bg-destructive/10 hover:text-destructive"
                                    disabled={isEditing}
                                >
                                    <X size={24} strokeWidth={1.75} />
                                </Button>
                            )}
                </div>
            </CardContent>
        </Card>
    );
};

export default ItemCheckBox;
