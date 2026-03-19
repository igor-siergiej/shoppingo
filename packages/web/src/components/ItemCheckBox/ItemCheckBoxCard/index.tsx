import type { Item, ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { Check, ImageOff, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, CardContent } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { Skeleton } from '../../../components/ui/skeleton';
import { DueDateBadge } from '../DueDateBadge';
import { QuantityBadge } from '../QuantityBadge';

interface ItemCheckBoxCardProps {
    item: Item;
    listType: ListType;
    imageBlobUrl: string | null;
    hasLoadedImage: boolean;
    hasImageError: boolean;
    isLoading: boolean;
    isSelected: boolean;
    onToggle: () => void;
    onImageLoad: () => void;
    onImageError: () => void;
}

export const ItemCheckBoxCard = ({
    item,
    listType,
    imageBlobUrl,
    hasLoadedImage,
    hasImageError,
    isLoading,
    isSelected,
    onToggle,
    onImageLoad,
    onImageError,
}: ItemCheckBoxCardProps) => {
    return (
        <Card
            className={`transition-all rounded-lg duration-200 py-0.5 px-1 cursor-pointer ${
                isSelected
                    ? 'bg-primary/10 border-primary/20 shadow-md'
                    : 'bg-background hover:bg-accent/50 border-border'
            } ${isLoading ? 'pointer-events-none' : ''}`}
            onClick={onToggle}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggle();
                }
            }}
        >
            <CardContent className="flex items-center justify-between p-0.5">
                <div className="flex items-center gap-4 flex-1">
                    {/* Item Icon */}
                    <div className="relative h-12 w-12 shrink-0 flex items-center justify-center">
                        {listType === ListTypeEnum.TODO ? (
                            <>
                                <div
                                    className={`h-6 w-6 rounded border-2 flex items-center justify-center transition-all ${
                                        isSelected
                                            ? 'bg-primary border-primary'
                                            : 'border-muted-foreground hover:border-primary'
                                    }`}
                                >
                                    {isSelected && <Check className="h-4 w-4 text-white" />}
                                </div>
                                {isLoading && (
                                    <motion.div
                                        className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    </motion.div>
                                )}
                            </>
                        ) : (
                            <>
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

                                {isLoading && (
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
                            </>
                        )}
                    </div>

                    <Label
                        className={`flex-1 cursor-pointer text-base transition-all duration-300 ${isSelected ? 'text-muted-foreground' : 'text-foreground'}`}
                    >
                        <span className="relative inline-block">
                            {item.name}
                            {isSelected && (
                                <motion.div
                                    className="absolute left-0 right-0 top-1/2 h-[2px] bg-muted-foreground/60"
                                    initial={{ scaleX: 0, originX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                />
                            )}
                        </span>
                    </Label>
                </div>

                {listType === ListTypeEnum.SHOPPING && <QuantityBadge quantity={item.quantity} unit={item.unit} />}
                {listType === ListTypeEnum.TODO && <DueDateBadge dueDate={item.dueDate} />}
            </CardContent>
        </Card>
    );
};
