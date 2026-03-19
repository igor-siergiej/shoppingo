'use client';

import { Loader2, Plus, Users } from 'lucide-react';
import { useCallback, useId, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { toast } from 'sonner';
import { addUserToList, removeUserFromList } from '@/api';
import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSearch } from '@/hooks/useSearch';
import { UserListItem } from './UserListItem';

interface ManageUsersDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    listTitle: string;
    currentUsers: Array<{ id: string; username: string }>;
    ownerId: string;
    currentUserId: string;
    onUserAdded: () => void;
    onUserRemoved: () => void;
}

export const ManageUsersDrawer = ({
    open,
    onOpenChange,
    listTitle,
    currentUsers,
    ownerId,
    currentUserId,
    onUserAdded,
    onUserRemoved,
}: ManageUsersDrawerProps) => {
    const searchUsersId = useId();
    const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);

    const {
        query: searchInput,
        setQuery: setSearchInput,
        results: searchResults,
        isLoading: isSearching,
    } = useSearch();

    // Filter out users already in the list and convert usernames to user objects
    const availableUsers = useMemo(() => {
        if (!searchResults || !searchResults.usernames || searchResults.usernames.length === 0) return [];
        // searchResults.usernames is an array of username strings or objects with username property
        return searchResults.usernames
            .map((item) => {
                const username = typeof item === 'string' ? item : item.username || '';
                return { id: username, username }; // Use username as both id and username for search results
            })
            .filter((user) => !currentUsers.some((u) => u.username === user.username));
    }, [searchResults, currentUsers]);

    const addUserMutation = useMutation({
        mutationFn: (username: string) => addUserToList(listTitle, username),
        onSuccess: () => {
            toast.success('User added successfully', {
                style: {
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                },
            });
            setSearchInput('');
            onUserAdded();
        },
        onError: (error: unknown) => {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to add user', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                },
            });
        },
    });

    const removeUserMutation = useMutation({
        mutationFn: (userId: string) => removeUserFromList(listTitle, userId),
        onSuccess: () => {
            toast.success('User removed successfully', {
                style: {
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                },
            });
            setConfirmRemoveUserId(null);
            onUserRemoved();
        },
        onError: (error: unknown) => {
            const err = error as { message?: string };
            toast.error(err.message || 'Failed to remove user', {
                style: {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                },
            });
            setConfirmRemoveUserId(null);
        },
    });

    const handleAddUser = useCallback(
        (username: string) => {
            addUserMutation.mutate(username);
        },
        [addUserMutation]
    );

    const handleRemoveUser = useCallback(
        (userId: string) => {
            if (userId === ownerId) {
                toast.error('Cannot remove the list owner', {
                    style: {
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                    },
                });
                return;
            }

            removeUserMutation.mutate(userId);
        },
        [ownerId, removeUserMutation]
    );

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <div className="mx-auto w-full max-w-sm flex flex-col h-[500px] max-h-[500px]">
                    <DrawerHeader className="flex-shrink-0">
                        <DrawerTitle>Manage Users</DrawerTitle>
                        <DrawerDescription>{listTitle}</DrawerDescription>
                    </DrawerHeader>

                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-4">
                            {/* Members Section */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <Label className="text-sm font-semibold">Members ({currentUsers.length})</Label>
                                </div>

                                <div className="space-y-2">
                                    {currentUsers.map((user) => (
                                        <UserListItem
                                            key={user.id}
                                            user={user}
                                            isOwner={user.id === ownerId}
                                            currentUserId={currentUserId}
                                            isRemoving={removeUserMutation.isLoading}
                                            isConfirming={confirmRemoveUserId === user.id}
                                            onRemoveClick={() => setConfirmRemoveUserId(user.id)}
                                            onRemoveConfirm={() => handleRemoveUser(user.id)}
                                            onRemoveCancel={() => setConfirmRemoveUserId(null)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Add Members Section */}
                            <div className="pt-4 border-t">
                                <Label htmlFor="search-users" className="text-sm font-semibold mb-3 block">
                                    Add Members
                                </Label>

                                <div className="relative">
                                    <Input
                                        id={searchUsersId}
                                        placeholder="Search for users..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
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
                                                    onClick={() => handleAddUser(user.username)}
                                                    disabled={addUserMutation.isLoading}
                                                >
                                                    <span>{user.username}</span>
                                                    {addUserMutation.isLoading ? (
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
                        </div>
                    </div>

                    <DrawerFooter className="flex-shrink-0">
                        <DrawerClose asChild>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Close
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
};
