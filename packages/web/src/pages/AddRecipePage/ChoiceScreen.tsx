import { ChefHat, Download, X } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface ChoiceScreenProps {
    onSelectImport: () => void;
    onSelectManual: () => void;
    onCancel: () => void;
}

export const ChoiceScreen = ({ onSelectImport, onSelectManual, onCancel }: ChoiceScreenProps) => (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background z-10">
            <h1 className="flex items-center gap-2 text-lg font-semibold">
                <ChefHat className="h-5 w-5" />
                Create Recipe
            </h1>
            <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel">
                <X className="h-5 w-5" />
            </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
            <div className="space-y-3 py-8 max-w-lg mx-auto w-full">
                <button
                    type="button"
                    onClick={onSelectImport}
                    className="w-full flex items-center gap-4 rounded-lg border border-border p-4 text-left hover:bg-muted/50 transition-colors"
                >
                    <Download className="h-8 w-8 shrink-0 text-muted-foreground" />
                    <div>
                        <p className="font-semibold">Import from a link</p>
                        <p className="text-sm text-muted-foreground">Paste a link and we'll fill in the details</p>
                    </div>
                </button>
                <button
                    type="button"
                    onClick={onSelectManual}
                    className="w-full flex items-center gap-4 rounded-lg border border-border p-4 text-left hover:bg-muted/50 transition-colors"
                >
                    <ChefHat className="h-8 w-8 shrink-0 text-muted-foreground" />
                    <div>
                        <p className="font-semibold">Add manually</p>
                        <p className="text-sm text-muted-foreground">Start from a blank recipe</p>
                    </div>
                </button>
            </div>
        </div>
    </div>
);
