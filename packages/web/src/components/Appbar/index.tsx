import { Trash2, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppbarProps } from './types';

const Appbar = ({ handleClearSelected, handleRemoveAll, handleGoToListsScreen }: AppbarProps) => {
    return (
        <header className="bg-primary text-primary-foreground shadow-md">
            <div className="w-full px-4">
                <div className="flex items-center justify-between h-16">
                    {handleGoToListsScreen
                        ? (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        handleGoToListsScreen();
                                    }}
                                >
                                    Go Back
                                </Button>
                            )
                        : null}

                    <h1 className="text-2xl font-bold flex-grow text-center">
                        Shoppingo
                    </h1>

                    <div className="flex items-center space-x-2">
                        {handleRemoveAll && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    handleRemoveAll();
                                }}
                                className="text-primary-foreground hover:bg-primary-foreground/10"
                            >
                                <Trash2 className="h-5 w-5" />
                            </Button>
                        )}

                        {handleClearSelected && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    handleClearSelected();
                                }}
                                className="text-primary-foreground hover:bg-primary-foreground/10"
                            >
                                <CheckCheck className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Appbar;
