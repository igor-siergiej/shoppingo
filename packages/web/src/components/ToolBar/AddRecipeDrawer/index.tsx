import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '../../../components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '../../../components/ui/drawer';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { RippleButton } from '../../../components/ui/ripple';

export interface AddRecipeDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (name: string) => Promise<void>;
    placeholder?: string;
}

export const AddRecipeDrawer = ({ open, onOpenChange, onAdd, placeholder }: AddRecipeDrawerProps) => {
    const recipeNameId = useId();
    const [newName, setNewName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        const trimmedName = newName.trim();

        if (!trimmedName) {
            setError('Recipe name is required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await onAdd(trimmedName);

            setNewName('');
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create recipe');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setNewName('');
        setError('');
        onOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            void handleSubmit();
        }
    };

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerTrigger asChild>
                <RippleButton
                    size="icon"
                    variant="secondary"
                    className="h-12 w-12 rounded-full shadow-lg"
                    aria-label="Add recipe"
                >
                    <Plus className="h-6 w-6" />
                </RippleButton>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Create Recipe</DrawerTitle>
                </DrawerHeader>
                <div className="space-y-4 px-4">
                    <div className="space-y-2">
                        <Label htmlFor={recipeNameId}>Recipe Name</Label>
                        <Input
                            id={recipeNameId}
                            placeholder={placeholder || 'Enter recipe name...'}
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DrawerFooter>
                    <Button onClick={() => void handleSubmit()} disabled={isLoading || !newName.trim()}>
                        {isLoading ? 'Creating...' : 'Create Recipe'}
                    </Button>
                    <DrawerClose asChild>
                        <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                            Cancel
                        </Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
};
