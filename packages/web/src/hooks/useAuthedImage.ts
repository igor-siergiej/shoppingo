import { useEffect, useRef, useState } from 'react';
import { getAccessToken } from '../auth/accessTokenStore';
import { refreshSession } from '../auth/refreshSession';

export interface UseAuthedImageResult {
    imageUrl: string | null;
    isLoading: boolean;
    hasError: boolean;
}

// The access token is only refreshed on demand, so it can expire while a screen is open. A 401 on a token we
// did send gets one refresh-and-retry, like makeRequest. A request with no token stays a plain failure: there is
// no session to refresh, and guests must not trigger one.
// fallow-ignore-next-line complexity
const fetchImageObjectUrl = async (imageKey: string): Promise<string> => {
    const url = `/api/image/${encodeURIComponent(imageKey)}`;
    const token = getAccessToken();
    let response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (response.status === 401 && token) {
        const freshToken = await refreshSession();
        if (freshToken) response = await fetch(url, { headers: { Authorization: `Bearer ${freshToken}` } });
    }
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
