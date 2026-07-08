'use client';

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
import { Label } from '../../components/ui/label';
import { useManageUsers } from '../../hooks/useManageUsers';
import { FriendPicker } from '../FriendPicker';

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
    onUserAdded,
    onUserRemoved,
}: ManageUsersDrawerProps) => {
    const { addUserMutation, removeUserMutation } = useManageUsers({ listTitle });

    const ownerUsername = currentUsers.find((u) => u.id === ownerId)?.username;
    const memberIds = currentUsers.filter((u) => u.id !== ownerId).map((u) => u.id);

    const handleChange = (nextIds: string[]) => {
        const added = nextIds.filter((id) => !memberIds.includes(id));
        const removed = memberIds.filter((id) => !nextIds.includes(id));

        for (const friendId of added) {
            addUserMutation.mutate(friendId, { onSuccess: onUserAdded });
        }
        for (const userId of removed) {
            removeUserMutation.mutate(userId, { onSuccess: onUserRemoved });
        }
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
                            {ownerUsername && <p className="text-sm text-muted-foreground">Owner: {ownerUsername}</p>}

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Members</Label>
                                <FriendPicker value={memberIds} onChange={handleChange} />
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
