import { Loader2, Plus } from 'lucide-react';
import { useId } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

interface ManageUsersSearchSectionProps {
    searchInput: string;
    onSearchChange: (value: string) => void;
    availableUsers: Array<{ id: string; username: string }>;
    isSearching: boolean;
    isAdding: boolean;
    onAddUser: (username: string) => void;
}

export const ManageUsersSearchSection = ({
    searchInput,
    onSearchChange,
    availableUsers,
    isSearching,
    isAdding,
    onAddUser,
}: ManageUsersSearchSectionProps) => {
    const searchUsersId = useId();

    return (
        <div className="pt-4 border-t">
            <Label htmlFor="search-users" className="text-sm font-semibold mb-3 block">
                Add Members
            </Label>

            <div className="relative">
                <Input
                    id={searchUsersId}
                    placeholder="Search for users..."
                    value={searchInput}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className={isSearching ? 'pr-8' : ''}
                />
                {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {searchInput && (
                <div className="mt-3 space-y-2">
                    {availableUsers.length > 0 ? (
                        availableUsers.map((user) => (
                            <Button
                                key={user.id}
                                variant="outline"
                                className="w-full justify-between"
                                onClick={() => onAddUser(user.username)}
                                disabled={isAdding}
                            >
                                <span>{user.username}</span>
                                {isAdding ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                            </Button>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            {isSearching ? 'Searching...' : 'No users found or already added'}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
