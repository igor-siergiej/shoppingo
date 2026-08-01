import { ImageOff } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

interface ItemAvatarProps {
    name: string;
    imageBlobUrl: string | null;
    hasLoadedImage: boolean;
    hasImageError: boolean;
    onImageLoad: () => void;
    onImageError: () => void;
}

type AvatarState = 'image' | 'loading' | 'error';

const resolveAvatarState = (hasLoadedImage: boolean, hasImageError: boolean): AvatarState => {
    if (hasImageError) return 'error';
    if (hasLoadedImage) return 'image';
    return 'loading';
};

// fallow-ignore-next-line complexity
export const ItemAvatar = ({
    name,
    imageBlobUrl,
    hasLoadedImage,
    hasImageError,
    onImageLoad,
    onImageError,
}: ItemAvatarProps) => {
    const state = resolveAvatarState(hasLoadedImage, hasImageError);

    return (
        <div className="relative h-12 w-12 shrink-0 flex items-center justify-center">
            {imageBlobUrl && (
                <img
                    src={imageBlobUrl}
                    alt={name}
                    className={`h-12 w-12 rounded-full object-cover border ${state === 'image' ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={onImageLoad}
                    onError={onImageError}
                />
            )}

            {state === 'loading' && <Skeleton className="absolute inset-0 h-12 w-12 rounded-full border" />}

            {state === 'error' && (
                <div className="absolute inset-0 h-12 w-12 rounded-full border flex items-center justify-center bg-muted/20 text-muted-foreground">
                    <ImageOff className="h-5 w-5" />
                </div>
            )}
        </div>
    );
};
