import { useEffect, useState } from 'react';

export interface UseItemImageReturn {
    imageBlobUrl: string | null;
    hasLoadedImage: boolean;
    hasImageError: boolean;
    onImageLoad: () => void;
    onImageError: () => void;
}

const buildImageUrl = (itemName: string): string => `/api/image/${encodeURIComponent(itemName)}`;

const handleImageResponse = async (
    response: Response,
    isMounted: boolean,
    onBlobUrl: (url: string) => void,
    onError: () => void
): Promise<string | null> => {
    if (!response.ok) {
        onError();
        return null;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    if (isMounted) {
        onBlobUrl(url);
    }
    return url;
};

export function useItemImage(itemName: string): UseItemImageReturn {
    const [hasLoadedImage, setHasLoadedImage] = useState(false);
    const [hasImageError, setHasImageError] = useState(false);
    const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        let currentBlobUrl: string | null = null;

        const fetchImage = async () => {
            try {
                const response = await fetch(buildImageUrl(itemName));

                if (!isMounted) return;

                currentBlobUrl = await handleImageResponse(response, isMounted, setImageBlobUrl, () =>
                    setHasImageError(true)
                );
            } catch (_error) {
                if (isMounted) {
                    setHasImageError(true);
                }
            }
        };

        void fetchImage();

        return () => {
            isMounted = false;
            if (currentBlobUrl) {
                URL.revokeObjectURL(currentBlobUrl);
            }
        };
    }, [itemName]);

    return {
        imageBlobUrl,
        hasLoadedImage,
        hasImageError,
        onImageLoad: () => setHasLoadedImage(true),
        onImageError: () => setHasImageError(true),
    };
}
