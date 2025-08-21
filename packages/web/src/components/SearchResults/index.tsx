import { Loader2, User } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

export interface SearchResult {
    success: 'true' | 'false';
    usernames: Array<string>;
    count: number;
    query: string;
}

interface SearchResultsProps {
    results: SearchResult;
    isLoading: boolean;
    error: string | null;
    onSelect: (username: string) => void;
    onClose: () => void;
}

export const SearchResults = ({ results, isLoading, error, onSelect, onClose }: SearchResultsProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Close results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    if (isLoading) {
        return (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50">
                <div className="p-4 flex items-center justify-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Searching...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50">
                <div className="p-4 text-center text-destructive text-sm">
                    {error}
                </div>
            </div>
        );
    }

    if (results.usernames.length === 0) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-80"
        >
            <ScrollArea className="max-h-80">
                <div className="p-1">
                    {results.usernames.map(username => (
                        <Button
                            key={username}
                            variant="ghost"
                            className="w-full justify-start h-auto p-3 hover:bg-accent"
                            onClick={() => onSelect(username)}
                        >
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm">{username}</span>
                        </Button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};
