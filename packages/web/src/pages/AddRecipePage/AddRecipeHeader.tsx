import { ChefHat, X } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface AddRecipeHeaderProps {
    onCancel: () => void;
    disabled?: boolean;
}

export const AddRecipeHeader = ({ onCancel, disabled }: AddRecipeHeaderProps) => (
    <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background z-10">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
            <ChefHat className="h-5 w-5" />
            Create Recipe
        </h1>
        <Button variant="ghost" size="icon" onClick={onCancel} disabled={disabled} aria-label="Cancel">
            <X className="h-5 w-5" />
        </Button>
    </div>
);
