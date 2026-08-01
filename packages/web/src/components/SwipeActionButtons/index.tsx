import { Edit2, Loader2, Trash2 } from 'lucide-react';
import type { MouseEvent } from 'react';
import { Button } from '../ui/button';

interface SwipeActionButtonsProps {
    isDeleting: boolean;
    isDeleteLoading: boolean;
    onDelete: (e?: MouseEvent) => void;
    onEdit: (e?: MouseEvent) => void;
}

export const SwipeActionButtons = ({ isDeleting, isDeleteLoading, onDelete, onEdit }: SwipeActionButtonsProps) => {
    if (isDeleting) return null;

    return (
        <>
            <div className="absolute inset-y-0 right-0 flex items-center justify-end w-32">
                <Button
                    onClick={onDelete}
                    disabled={isDeleteLoading}
                    className="h-[calc(100%-2px)] w-full rounded-lg bg-destructive hover:bg-destructive/90 text-white border border-destructive/20 shadow-sm flex items-center justify-end mr-1"
                >
                    <div className="flex items-center justify-center pr-3.5">
                        {isDeleteLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 size={20} />}
                    </div>
                </Button>
            </div>

            <div className="absolute inset-y-0 left-0 flex items-center justify-start pl-1 w-32">
                <Button
                    onClick={onEdit}
                    className="h-[calc(100%-2px)] w-full rounded-lg bg-blue-500 hover:bg-blue-600 text-white border border-blue-600/20 shadow-sm flex items-center"
                >
                    <div className="flex items-center justify-center pr-10">
                        <Edit2 size={20} />
                    </div>
                </Button>
            </div>
        </>
    );
};
