import type { RecipeTextExtractor } from '../../domain/RecipeImportService/types';

export interface FalRecipeExtractorOptions {
    model?: string;
    timeoutMs?: number;
}

const SYSTEM_PROMPT =
    'You extract a single recipe from the plain text of a web page. Reply with ONLY a compact JSON object of the ' +
    'shape {"title": string, "ingredients": string[], "instructions": string[]}. Each ingredient is one full line ' +
    '(quantity, unit and item together). Each instruction is one step. Do not invent content that is not present. ' +
    'If a field is unknown use an empty string or empty array. Output no prose, no markdown, no code fences.';

interface ExtractedRecipe {
    title: string;
    ingredients: string[];
    instructions: string[];
}

export class FalRecipeExtractor implements RecipeTextExtractor {
    private readonly model: string;
    private readonly timeoutMs: number;

    constructor(
        private readonly apiKey: string,
        options: FalRecipeExtractorOptions = {}
    ) {
        // Cheap, fast, non-premium default on fal's any-llm; override via RECIPE_IMPORT_LLM_MODEL.
        this.model = options.model ?? 'google/gemini-2.5-flash-lite';
        this.timeoutMs = options.timeoutMs ?? 15000;
    }

    async extract(text: string): Promise<ExtractedRecipe> {
        if (!this.apiKey) {
            throw Object.assign(new Error('Recipe import LLM not configured'), { status: 500 });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        let response: Response;
        try {
            response = await fetch('https://fal.run/fal-ai/any-llm', {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Key ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    system_prompt: SYSTEM_PROMPT,
                    prompt: `Extract the recipe from this page text:\n\n${text}`,
                    temperature: 0,
                }),
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            const error = await response.text();
            throw Object.assign(new Error(`fal.ai any-llm error: ${error}`), { status: 502 });
        }

        const data = (await response.json()) as { output?: string; error?: string };
        if (data.error) {
            throw Object.assign(new Error(`fal.ai any-llm error: ${data.error}`), { status: 502 });
        }

        return this.parseOutput(data.output ?? '');
    }

    // The model may wrap JSON in prose or code fences; pull out the first JSON object and parse defensively.
    private parseOutput(output: string): ExtractedRecipe {
        const start = output.indexOf('{');
        const end = output.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            throw Object.assign(new Error('LLM returned no JSON object'), { status: 502 });
        }

        const parsed = JSON.parse(output.slice(start, end + 1)) as Record<string, unknown>;
        const toStrings = (v: unknown): string[] =>
            Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

        return {
            title: typeof parsed.title === 'string' ? parsed.title : '',
            ingredients: toStrings(parsed.ingredients),
            instructions: toStrings(parsed.instructions),
        };
    }
}
