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

                const headers: Record<string, string> = {};
                if (accessToken) {
                    headers.Authorization = `Bearer ${accessToken}`;
                }

                const response = await fetch(`/api/image/${encodeURIComponent(itemName)}`, {
                    method: 'GET',
                    headers,
                });

                if (!isMounted) return;

                if (!response.ok) {
                    if (isMounted) {
                        setHasImageError(true);
                    }
                    return;
                }

                const blob = await response.blob();
                currentBlobUrl = URL.createObjectURL(blob);
                if (isMounted) {
                    setImageBlobUrl(currentBlobUrl);
                }
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
