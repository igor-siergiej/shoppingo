import type { DiscoveryRecipeSummary } from '@shoppingo/types';
import { DiscoveryMeta } from '../../components/DiscoveryMeta';

const MAX_TAGS = 4;

export const ResultCard = ({ recipe, onClick }: { recipe: DiscoveryRecipeSummary; onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className="w-full rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 active:bg-muted/50"
    >
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{recipe.title}</h3>
        <div className="mt-1.5">
            <DiscoveryMeta recipe={recipe} />
        </div>
        {recipe.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
                {recipe.tags.slice(0, MAX_TAGS).map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {tag}
                    </span>
                ))}
            </div>
        )}
    </button>
);
