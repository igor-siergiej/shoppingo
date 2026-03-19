import type { ListResponse } from '@shoppingo/types';
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
import { useConfirmation } from '../../hooks/useConfirmation';

import { deleteList, updateListName } from '../../api';
import { ListItem } from './ListItem';
import type { ListsListProps } from './types';

const ListsList = ({ lists, refetch, currentUserId }: ListsListProps) => {
    const navigate = useNavigate();
    const [editingList, setEditingList] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const { confirm, isOpen, config, handleConfirm, handleCancel } = useConfirmation();

    const handleEditStart = (listTitle: string) => {
        setEditingList(listTitle);
        setEditValue(listTitle);
    };

    const handleEditSave = async (originalTitle: string) => {
        if (editValue.trim() && editValue !== originalTitle) {
            try {
                await updateListName(originalTitle, editValue.trim());
                refetch();
            } catch (error) {
                console.error('Error updating list name:', error);
            }
        }

        setEditingList(null);
        setEditValue('');
    };

    const handleEditCancel = () => {
        setEditingList(null);
        setEditValue('');
    };

    const renderedOutput = lists.map((list: ListResponse) => (
        <ListItem
            key={list.title}
            list={list}
            isOwner={list.ownerId === currentUserId}
            isEditing={editingList === list.title}
            editValue={editValue}
            onEditChange={setEditValue}
            onEditStart={() => handleEditStart(list.title)}
            onEditSave={() => handleEditSave(list.title)}
            onEditCancel={handleEditCancel}
            onDelete={() => {
                confirm({
                    title: 'Delete List?',
                    description: `Are you sure you want to delete "${list.title}"? This action cannot be undone and all items will be permanently removed.`,
                    actionLabel: 'Delete List',
                    onConfirm: async () => {
                        await deleteList(list.title);
                        refetch();
                    },
                });
            }}
            onNavigate={() => navigate(`/list/${list.title}`)}
        />
    ));

    return (
        <>
            {renderedOutput}
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

export default ListsList;
