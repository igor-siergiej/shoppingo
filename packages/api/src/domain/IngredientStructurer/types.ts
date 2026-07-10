/** An ingredient line broken into a clean name plus optional measurement. */
export interface ParsedIngredient {
    name: string;
    quantity?: number;
    unit?: string;
}

export interface IngredientStructurer {
    /** Identifies the implementation in import logs, so the LLM path can be evaluated against the rule path. */
    readonly strategy: 'rule' | 'llm';

    /**
     * Turn raw ingredient lines into names plus optional quantity/unit. Names carry no measurements.
     * Returns exactly one entry per input line, in input order. Throws if that cannot be honoured.
     */
    structure(lines: string[]): Promise<ParsedIngredient[]>;
}
