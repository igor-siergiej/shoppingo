interface GroupByAisleToggleProps {
    grouped: boolean;
    onToggle: () => void;
}

export const GroupByAisleToggle = ({ grouped, onToggle }: GroupByAisleToggleProps) => (
    <div className="flex justify-end pb-1">
        <button
            type="button"
            aria-pressed={grouped}
            onClick={onToggle}
            className="rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
            {grouped ? 'Ungroup' : 'Group by aisle'}
        </button>
    </div>
);
