import { ListResponse } from '@shoppingo/types';
import { Check, Edit2, X, X as XIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { deleteList, updateListName } from '../../api';
import { ListsListProps } from './types';

const ListsList = ({ lists, refetch }: ListsListProps) => {
    const navigate = useNavigate();
    const [editingList, setEditingList] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');

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
        <Card
            key={list.title}
            className="mb-2 transition-all duration-200 bg-background hover:bg-accent/50 py-0"
        >
            <CardContent className="flex items-center justify-between p-0.5 ">
                <div className="flex-1">
                    {editingList === list.title
                        ? (
                                <div className="flex items-center space-x-2 px-3">
                                    <Input
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleEditSave(list.title);
                                            }

                                            if (e.key === 'Escape') {
                                                handleEditCancel();
                                            }
                                        }}
                                        className="flex-1"
                                        autoFocus
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditSave(list.title)}
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
                                        <XIcon size={16} />
                                    </Button>
                                </div>
                            )
                        : (
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-left text-base font-medium"
                                    onClick={() => {
                                        navigate(`/list/${list.title}`);
                                    }}
                                >
                                    {list.title}
                                </Button>
                            )}
                </div>

                <div className="flex items-center">
                    {editingList !== list.title && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditStart(list.title)}
                            className="h-12 w-12 hover:bg-blue-50 hover:text-blue-600"
                        >
                            <Edit2 size={20} strokeWidth={1.75} />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                            await deleteList(list.title);
                            refetch();
                        }}
                        className="h-12 w-12 hover:bg-destructive/10 hover:text-destructive"
                        disabled={editingList === list.title}
                    >
                        <X size={24} strokeWidth={1.75} />
                    </Button>
                </div>
            </CardContent>
        </Card>
    ));

    return renderedOutput;
};

export default ListsList;
