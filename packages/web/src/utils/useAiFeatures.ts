// fallow-ignore-file unused-file
import { useEffect, useState } from 'react';

export interface AiFeatures {
    imageGeneration: boolean;
    recipeImport: boolean;
    ingredientSubstitutes: boolean;
    itemCategorisation: boolean;
    itemParse: boolean;
    recipeTagger: boolean;
}

// fallow-ignore-next-line unused-export
export const DEFAULT_AI_FEATURES: AiFeatures = {
    imageGeneration: false,
    recipeImport: false,
    ingredientSubstitutes: false,
    itemCategorisation: false,
    itemParse: false,
    recipeTagger: false,
};

let cached: { value: AiFeatures } | null = null;
let inflight: Promise<AiFeatures> | null = null;

const fetchFeatures = async (): Promise<AiFeatures> => {
    if (cached) return cached.value;
    if (inflight) return inflight;
    inflight = (async () => {
        try {
            const res = await fetch('/api/features');
            if (!res.ok) {
                return DEFAULT_AI_FEATURES;
            }
            const data = (await res.json()) as Partial<AiFeatures>;
            const merged: AiFeatures = { ...DEFAULT_AI_FEATURES, ...data };
            cached = { value: merged };
            return merged;
        } catch {
            return DEFAULT_AI_FEATURES;
        } finally {
            inflight = null;
        }
    })();
    return inflight;
};

/**
 * Reports which AI features the API has wired. When FAL_KEY is empty the
 * server returns all-false; the hook then drives hiding of the import-by-link
 * button, the recipe/image generator and the ingredient-substitutes popover,
 * with a short "Not available on this server" note.
 */
export const useAiFeatures = (): AiFeatures => {
    const [features, setFeatures] = useState<AiFeatures>(() => cached?.value ?? DEFAULT_AI_FEATURES);
    useEffect(() => {
        let cancelled = false;
        fetchFeatures().then((value) => {
            if (!cancelled) setFeatures(value);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    return features;
};
