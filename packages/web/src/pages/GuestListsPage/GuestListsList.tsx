import type { ListResponse } from '@shoppingo/types';
import { Check, Edit2, ShoppingCart, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useGuestListActions } from '../../guest/useGuestActions';
import { useConfirmation } from '../../hooks/useConfirmation';

// Guest version of the lists list. Mirrors the shape of `ListsList` but
// routes edits / deletes through `useGuestListActions` so the data stays
// local. Guests own every list they create, so the edit/delete icons always
// show — there is no shared-list concept in guest mode.

interface GuestListsListProps {
    lists: Array<ListResponse>;
}

export const GuestListsList = ({ lists }: GuestListsListProps) => {
    const navigate = useNavigate();
    const { renameList, deleteList } = useGuestListActions();
    const [editingList, setEditingList] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const { confirm, isOpen, config, handleConfirm, handleCancel } = useConfirmation();

    const handleEditStart = (list: ListResponse) => {
        setEditingList(list.id);
        setEditValue(list.title);
    };

    const handleEditSave = async (list: ListResponse) => {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== list.title) {
            try {
                await renameList(list.id, trimmed);
            } catch (error) {
                console.error('Error renaming guest list', error);
            }
        }
        setEditingList(null);
        setEditValue('');
    };

    const handleEditCancel = () => {
        setEditingList(null);
        setEditValue('');
    };

    return (
        <>
            {lists.map((list) => (
                <Card key={list.id} className="mb-2 transition-all duration-200 bg-background hover:bg-accent/50 py-0">
                    <CardContent className="flex items-center justify-between p-0.5 min-h-12">
                        <div className="flex-1">
                            {editingList === list.id ? (
                                <div className="flex items-center space-x-2 px-3">
                                    <Input
                                        purpose="name"
                                        value={editValue}
                                        onChange={(event) => setEditValue(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') handleEditSave(list);
                                            else if (event.key === 'Escape') handleEditCancel();
                                        }}
                                        className="flex-1"
                                        autoFocus
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditSave(list)}
                                        className="h-8 w-8 text-green-600 hover:bg-green-50"
                                    >
                                        <Check size={16} />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleEditCancel}
                                        className="h-8 w-8 text-gray-500 hover:bg-gray-50"
                                    >
                                        <X size={16} />
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-left text-base font-medium hover:bg-transparent"
                                    onClick={() => navigate(`/list/${list.id}`)}
                                >
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span>{list.title}</span>
                                    </div>
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center">
                            {editingList !== list.id && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditStart(list)}
                                    className="h-12 w-12 hover:bg-blue-50 hover:text-blue-600"
                                >
                                    <Edit2 size={20} strokeWidth={1.75} />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    confirm({
                                        title: 'Delete List?',
                                        description: `"${list.title}" is stored on this device only — deleting it here removes it for good.`,
                                        actionLabel: 'Delete List',
                                        onConfirm: async () => {
                                            await deleteList(list.id);
                                        },
                                    });
                                }}
                                className="h-12 w-12 hover:bg-destructive/10 hover:text-destructive"
                                disabled={editingList === list.id}
                            >
                                <X size={24} strokeWidth={1.75} />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
            <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{config?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{config?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancel}>{config?.cancelLabel || 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm}>
                            {config?.actionLabel || 'Confirm'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
