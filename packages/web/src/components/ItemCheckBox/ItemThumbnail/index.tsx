import type { Item, ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { Check, ImageOff, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Skeleton } from '@/components/ui/skeleton';

interface ItemThumbnailProps {
    item: Item;
    listType: ListType;
    imageBlobUrl?: string;
    hasLoadedImage: boolean;
    hasImageError: boolean;
    onImageLoad: () => void;
    onImageError: () => void;
    isToggling: boolean;
}

export const ItemThumbnail = ({
    item,
    listType,
    imageBlobUrl,
    hasLoadedImage,
    hasImageError,
    onImageLoad,
    onImageError,
    isToggling,
}: ItemThumbnailProps) => {
    if (listType === ListTypeEnum.TODO) {
        return (
            <div className="relative h-12 w-12 shrink-0 flex items-center justify-center">
                <div
                    className={`h-6 w-6 rounded border-2 flex items-center justify-center transition-all ${
                        item.isSelected ? 'bg-primary border-primary' : 'border-muted-foreground hover:border-primary'
                    }`}
                >
                    {item.isSelected && <Check className="h-4 w-4 text-white" />}
                </div>
                {isToggling && (
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                    >
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </motion.div>
                )}
            </div>
        );
    }

    return (
        <div className="relative h-12 w-12 shrink-0">
            {imageBlobUrl && (
                <img
                    src={imageBlobUrl}
                    alt={item.name}
                    className={`h-12 w-12 rounded-full object-cover border ${hasLoadedImage && !hasImageError ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={onImageLoad}
                    onError={onImageError}
                />
            )}

            {!hasLoadedImage && !hasImageError && (
                <Skeleton className="absolute inset-0 h-12 w-12 rounded-full border" />
            )}

            {isToggling && (
                <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                >
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </motion.div>
            )}

            {hasImageError && (
                <div className="absolute inset-0 h-12 w-12 rounded-full border flex items-center justify-center bg-muted/20 text-muted-foreground">
                    <ImageOff className="h-5 w-5" />
                </div>
            )}
        </div>
    );
};
