import type { ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { Plus, Search, User } from 'lucide-react';
import { useState } from 'react';
import { SearchResults } from '@/components/SearchResults';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RippleButton } from '@/components/ui/ripple';
import { useSearch } from '../../../hooks/useSearch';

export interface AddListDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (name: string, listType: ListType, users: string[]) => Promise<void>;
    placeholder?: string;
}

export const AddListDrawer = ({ open, onOpenChange, onAdd, placeholder }: AddListDrawerProps) => {
    const [newName, setNewName] = useState('');
    const [listType, setListType] = useState<ListType>(ListTypeEnum.SHOPPING);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { query, results, isLoading: isSearching, error: searchError, setQuery, clearResults } = useSearch();

    const handleUserSelect = (username: string) => {
        setSelectedUsers((prev) => (prev.includes(username) ? prev : [...prev, username]));
        clearResults();
        setQuery('');
    };

    const removeSelectedUser = (username: string) => {
        setSelectedUsers((prev) => prev.filter((u) => u !== username));
    };

    const handleSubmit = async () => {
        const trimmedName = newName.trim();

        if (!trimmedName) {
            setError('List name is required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await onAdd(trimmedName, listType, selectedUsers);

            setNewName('');
            setListType(ListTypeEnum.SHOPPING);
            setSelectedUsers([]);
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create list');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setNewName('');
        setListType(ListTypeEnum.SHOPPING);
        setSelectedUsers([]);
        setError('');
        clearResults();
        setQuery('');
        onOpenChange(false);
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerTrigger asChild>
                <RippleButton
                    size="icon"
                    className="h-12 w-12 rounded-full border-2 border-primary/20 hover:border-primary/40 transition-colors"
                >
                    <Plus className="size-5" />
                </RippleButton>
            </DrawerTrigger>
            <DrawerContent>
                <div className="w-full sm:mx-auto sm:max-w-[400px]">
                    <DrawerHeader>
                        <DrawerTitle>Add New List</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 pb-0 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-list">List Name</Label>
                            <Input
                                id="new-list"
                                value={newName}
                                autoComplete="off"
                                autoFocus
                                className={`${error ? 'border-destructive' : ''} h-12 text-base`}
                                onChange={(event) => {
                                    setError('');
                                    setNewName(event.target.value);
                                }}
                                placeholder={placeholder}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        void handleSubmit();
                                    } else if (e.key === 'Escape') {
                                        handleCancel();
                                    }
                                }}
                            />
                            {error && <p className="text-sm text-destructive">{error}</p>}
                        </div>

                        {/* List type selector */}
                        <div className="space-y-2">
                            <Label>List Type</Label>
                            <div className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="shopping"
                                        name="listType"
                                        checked={listType === ListTypeEnum.SHOPPING}
                                        onChange={() => setListType(ListTypeEnum.SHOPPING)}
                                        className="cursor-pointer"
                                    />
                                    <Label htmlFor="shopping" className="cursor-pointer font-normal">
                                        Shopping
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        id="todo"
                                        name="listType"
                                        checked={listType === ListTypeEnum.TODO}
                                        onChange={() => setListType(ListTypeEnum.TODO)}
                                        className="cursor-pointer"
                                    />
                                    <Label htmlFor="todo" className="cursor-pointer font-normal">
                                        TODO
                                    </Label>
                                </div>
                            </div>
                        </div>

                        {/* User search */}
                        <div className="space-y-2">
                            <Label htmlFor="search-users">Search Users to Share With</Label>
                            <div className="relative">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="search-users"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Search users..."
                                        className="pl-10"
                                    />
                                </div>
                                <SearchResults
                                    results={results}
                                    isLoading={isSearching}
                                    error={searchError}
                                    onSelect={handleUserSelect}
                                    onClose={clearResults}
                                    query={query}
                                />
                            </div>

                            {/* Selected users */}
                            {selectedUsers.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">Selected Users:</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedUsers.map((username) => (
                                            <div
                                                key={username}
                                                className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                                            >
                                                <User className="h-3 w-3" />
                                                <span>{username}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-4 w-4 p-0 hover:bg-secondary-foreground/20"
                                                    onClick={() => removeSelectedUser(username)}
                                                >
                                                    ×
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <DrawerFooter>
                        <Button onClick={handleSubmit} disabled={isLoading}>
                            Add List
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
};
