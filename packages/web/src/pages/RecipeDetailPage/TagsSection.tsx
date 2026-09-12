import { X } from 'lucide-react';

interface TagsSectionProps {
    tags?: string[];
    isOwner?: boolean;
    onDeleteTag: (tag: string) => void;
}

export const TagsSection = ({ tags, isOwner = false, onDeleteTag }: TagsSectionProps) => {
    if (!tags || tags.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
                <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-foreground"
                >
                    {tag}
                    {isOwner && (
                        <button type="button" aria-label={`Remove tag ${tag}`} onClick={() => onDeleteTag(tag)}>
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </span>
            ))}
        </div>
    );
};
