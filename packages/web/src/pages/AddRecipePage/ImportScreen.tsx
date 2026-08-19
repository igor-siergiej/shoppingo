import { ChefHat, Download, X } from 'lucide-react';
import { useId } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

interface ImportScreenProps {
    link: string;
    setLink: (link: string) => void;
    isImporting: boolean;
    importError: string;
    onImport: () => void;
    onCancelImport: () => void;
    onSwitchToManual: () => void;
    onCancel: () => void;
}

export const ImportScreen = ({
    link,
    setLink,
    isImporting,
    importError,
    onImport,
    onCancelImport,
    onSwitchToManual,
    onCancel,
}: ImportScreenProps) => {
    const linkInputId = useId();

    return (
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
                <div className="space-y-4 py-8 max-w-lg mx-auto w-full">
                    <div className="space-y-2">
                        <Label htmlFor={linkInputId}>Recipe Link</Label>
                        <Input
                            id={linkInputId}
                            type="url"
                            placeholder="https://..."
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            disabled={isImporting}
                            autoFocus
                            className="h-10 border border-foreground/30"
                        />
                    </div>

                    <Button
                        type="button"
                        onClick={() => (isImporting ? onCancelImport() : onImport())}
                        disabled={!isImporting && !link.trim()}
                        aria-label={isImporting ? 'Cancel import' : 'Import recipe from link'}
                        className="w-full gap-1.5"
                    >
                        {isImporting ? (
                            <>
                                <X className="h-4 w-4" />
                                Cancel
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                Import
                            </>
                        )}
                    </Button>

                    {importError && (
                        <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            <p>{importError}</p>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onImport}
                                    disabled={isImporting || !link.trim()}
                                    className="font-medium underline disabled:opacity-50"
                                >
                                    Retry
                                </button>
                                <button type="button" onClick={onSwitchToManual} className="font-medium underline">
                                    Switch to manual
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onSwitchToManual}
                        className="text-sm text-muted-foreground underline"
                    >
                        or add manually instead
                    </button>
                </div>
            </div>
        </div>
    );
};
