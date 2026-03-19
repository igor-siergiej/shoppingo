'use client';

import { useState } from 'react';
import { Button } from '../../components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '../../components/ui/drawer';
import { useManageUsers } from '../../hooks/useManageUsers';
import { ManageUsersMembersList } from './ManageUsersMembersList';
import { ManageUsersSearchSection } from './ManageUsersSearchSection';

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
    const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);

    const {
        searchInput,
        setSearchInput,
        availableUsers,
        isSearching,
        addUserMutation,
        removeUserMutation,
        handleAddUser,
        handleRemoveUser,
    } = useManageUsers({ listTitle, currentUsers, ownerId });

    const handleAddUserWithCallback = (username: string) => {
        handleAddUser(username);
        onUserAdded();
    };

    const handleRemoveUserWithCallback = (userId: string) => {
        handleRemoveUser(userId);
        setConfirmRemoveUserId(null);
        onUserRemoved();
    };

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
                            <ManageUsersMembersList
                                currentUsers={currentUsers}
                                ownerId={ownerId}
                                currentUserId={currentUserId}
                                isRemoving={removeUserMutation.isLoading}
                                confirmRemoveUserId={confirmRemoveUserId}
                                onRemoveClick={setConfirmRemoveUserId}
                                onRemoveConfirm={handleRemoveUserWithCallback}
                                onRemoveCancel={() => setConfirmRemoveUserId(null)}
                            />

                            <ManageUsersSearchSection
                                searchInput={searchInput}
                                onSearchChange={setSearchInput}
                                availableUsers={availableUsers}
                                isSearching={isSearching}
                                isAdding={addUserMutation.isLoading}
                                onAddUser={handleAddUserWithCallback}
                            />
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
