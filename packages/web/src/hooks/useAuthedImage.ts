import { useEffect, useRef, useState } from 'react';
import { getAuthHeaders } from '../utils/authHeaders';

export interface UseAuthedImageResult {
    imageUrl: string | null;
    isLoading: boolean;
    hasError: boolean;
}

const fetchImageObjectUrl = async (imageKey: string): Promise<string> => {
    const response = await fetch(`/api/image/${encodeURIComponent(imageKey)}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Image request failed');
    return URL.createObjectURL(await response.blob());
};

/**
 * Fetch an authed image by key into an object URL, managing loading/error state and revoking
 * the URL on cleanup. Shared by recipe cover views so the fetch logic lives in one place.
 */
export const useAuthedImage = (imageKey: string | undefined): UseAuthedImageResult => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(Boolean(imageKey));
    const [hasError, setHasError] = useState(false);
    const objectUrlRef = useRef<string | null>(null);

    useEffect(() => {
        if (!imageKey) {
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setHasError(false);

        fetchImageObjectUrl(imageKey)
            .then((url) => {
                if (cancelled) {
                    URL.revokeObjectURL(url);
                    return;
                }
                objectUrlRef.current = url;
                setImageUrl(url);
            })
            .catch(() => {
                if (!cancelled) setHasError(true);
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
    }, [imageKey]);

    return { imageUrl, isLoading, hasError };
};
