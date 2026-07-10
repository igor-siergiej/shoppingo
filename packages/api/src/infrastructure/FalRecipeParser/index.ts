import type { ParsedIngredient } from '../../domain/IngredientStructurer/types';
import type { ParsedRecipe, RecipeParser } from '../../domain/RecipeImportService/types';

export interface FalRecipeParserOptions {
    model?: string;
    timeoutMs?: number;
}

const SYSTEM_PROMPT =
    'You extract a single recipe from a JSON-LD document or the plain text of a web page. Reply with ONLY a compact ' +
    'JSON object of the shape {"title": string, "ingredients": [{"name": string, "quantity"?: number, "unit"?: ' +
    'string}], "instructions": [string]}. "name" is the bare ingredient: no measurements, no parenthetical text, and ' +
    'no qualifiers such as "to taste", "optional" or "divided". Include "quantity" and "unit" only when the source ' +
    'states a measurement; use "pcs" as the unit for a bare count. Each instruction is one step. Do not invent ' +
    'content that is not present. Output no prose, no markdown, no code fences.';

const bad = (message: string): Error => Object.assign(new Error(message), { status: 502 });

export class FalRecipeParser implements RecipeParser {
    private readonly model: string;
    private readonly timeoutMs: number;

    constructor(
        private readonly apiKey: string,
        options: FalRecipeParserOptions = {}
    ) {
        this.model = options.model ?? 'google/gemini-2.5-flash-lite';
        this.timeoutMs = options.timeoutMs ?? 15000;
    }

    async parse(source: string): Promise<ParsedRecipe> {
        if (!this.apiKey) {
            throw Object.assign(new Error('Recipe import LLM not configured'), { status: 500 });
        }
        if (!source.trim()) {
            throw bad('No recipe source to parse');
        }

        return this.parseOutput(await this.callModel(source));
    }

    private async callModel(source: string): Promise<string> {
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
                    prompt: `Extract the recipe from this source:\n\n${source}`,
                    temperature: 0,
                }),
            });
        } catch (error) {
            // LLM-first has no draft to fall back on: fail the import loudly.
            throw bad(`fal.ai any-llm request failed: ${(error as Error).message}`);
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            let detail: string;
            try {
                detail = await response.text();
            } catch {
                detail = `HTTP ${response.status}`;
            }
            throw bad(`fal.ai any-llm error: ${detail}`);
        }

        let data: { output?: string; error?: string };
        try {
            data = (await response.json()) as { output?: string; error?: string };
        } catch {
            throw bad('fal.ai any-llm returned a non-JSON response body');
        }

        if (data.error) {
            throw bad(`fal.ai any-llm error: ${data.error}`);
        }
        return data.output ?? '';
    }

    // The model may wrap JSON in prose or code fences; pull out the first JSON object and validate it.
    private parseOutput(output: string): ParsedRecipe {
        const start = output.indexOf('{');
        const end = output.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            throw bad('LLM returned no JSON object');
        }

        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(output.slice(start, end + 1)) as Record<string, unknown>;
        } catch {
            throw bad('LLM returned malformed JSON');
        }

        if (!Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
            throw bad('LLM returned no ingredients');
        }

        return {
            title: typeof parsed.title === 'string' ? parsed.title.trim() : '',
            ingredients: parsed.ingredients.map((entry) => this.toParsedIngredient(entry)),
            instructions: Array.isArray(parsed.instructions)
                ? parsed.instructions.filter((step): step is string => typeof step === 'string')
                : [],
        };
    }

    private toParsedIngredient(entry: unknown): ParsedIngredient {
        const obj = (entry ?? {}) as Record<string, unknown>;
        const name = typeof obj.name === 'string' ? obj.name.trim() : '';
        if (!name) {
            throw bad('LLM returned an ingredient with no name');
        }

        const hasQuantity = typeof obj.quantity === 'number' && Number.isFinite(obj.quantity);
        const unit = typeof obj.unit === 'string' && obj.unit.trim() ? obj.unit.trim() : 'pcs';

        return {
            name,
            ...(hasQuantity && { quantity: obj.quantity as number }),
            ...(hasQuantity && { unit }),
        };
    }
}
