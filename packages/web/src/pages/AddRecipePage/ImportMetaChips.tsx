interface ImportMeta {
    prepTime?: string;
    cookTime?: string;
    recipeYield?: string;
}

interface ImportMetaChipsProps {
    importMeta: ImportMeta;
}

const CHIP_FIELDS: Array<{ key: keyof ImportMeta; label: string }> = [
    { key: 'prepTime', label: 'Prep' },
    { key: 'cookTime', label: 'Cook' },
    { key: 'recipeYield', label: 'Yield' },
];

export const ImportMetaChips = ({ importMeta }: ImportMetaChipsProps) => {
    const chips = CHIP_FIELDS.filter(({ key }) => importMeta[key]);
    if (chips.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {chips.map(({ key, label }) => (
                <span key={key} className="rounded-full border border-border px-2 py-0.5">
                    {label}: {importMeta[key]}
                </span>
            ))}
        </div>
    );
};
