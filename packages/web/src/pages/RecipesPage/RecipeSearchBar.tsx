import { Search, X } from 'lucide-react';
import { Input } from '../../components/ui/input';

interface RecipeSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onFocus: () => void;
    onBlur: () => void;
}

export const RecipeSearchBar = ({ value, onChange, onFocus, onBlur }: RecipeSearchBarProps) => (
    <div className="fixed left-0 right-0 z-30 px-4" style={{ bottom: '5.5rem' }}>
        <div className="relative mx-auto max-w-[500px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="Search recipes..."
                className="pl-9 pr-9 bg-background/95 backdrop-blur-sm shadow-md"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    </div>
);
