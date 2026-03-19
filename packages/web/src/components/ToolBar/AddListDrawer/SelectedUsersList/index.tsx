import { User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface SelectedUsersListProps {
    selectedUsers: string[];
    onRemoveUser: (username: string) => void;
}

export const SelectedUsersList = ({ selectedUsers, onRemoveUser }: SelectedUsersListProps) => {
    if (selectedUsers.length === 0) return null;

    return (
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
                            onClick={() => onRemoveUser(username)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
};
