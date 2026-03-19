import { getStorageItem } from '@imapps/web-utils';
import { useEffect, useState } from 'react';
import { getAuthConfig } from '../config/auth';

export interface UseItemImageReturn {
    imageBlobUrl: string | null;
    hasLoadedImage: boolean;
    hasImageError: boolean;
    onImageLoad: () => void;
    onImageError: () => void;
}

const buildImageUrl = (itemName: string): string => `/api/image/${encodeURIComponent(itemName)}`;

const buildHeaders = (accessToken: string | null): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
};

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
                const authConfig = getAuthConfig();
                const accessToken = getStorageItem(
                    authConfig.accessTokenKey || 'accessToken',
                    authConfig.storageType || 'localStorage'
                );

                const response = await fetch(buildImageUrl(itemName), {
                    method: 'GET',
                    headers: buildHeaders(accessToken),
                });

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
