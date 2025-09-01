import { Item } from '@shoppingo/types';
import { Check, Edit2, Loader2, X, X as XIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { deleteItem, updateItem, updateItemName } from '../../api';

export interface ItemCheckBoxProps {
    item: Item;
    listTitle: string;
    refetch: () => void;
}

const ItemCheckBox = ({ item, listTitle, refetch }: ItemCheckBoxProps) => {
    const [isUpdateLoading, setIsUpdateLoading] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');

    const handleUpdateItem = async () => {
        setIsUpdateLoading(true);
        await updateItem(item.name, !item.isSelected, listTitle);
        await refetch();
        setIsUpdateLoading(false);
    };

    const handleDeleteItem = async () => {
        setIsDeleteLoading(true);
        await deleteItem(item.name, listTitle);
        await refetch();
        setIsDeleteLoading(false);
    };

    const handleEditStart = () => {
        setIsEditing(true);
        setEditValue(item.name);
    };

    const handleEditSave = async () => {
        if (editValue.trim() && editValue !== item.name) {
            try {
                await updateItemName(listTitle, item.name, editValue.trim());
                await refetch();
            } catch (error) {
                console.error('Error updating item name:', error);
            }
        }

        setIsEditing(false);
        setEditValue('');
    };

    const handleEditCancel = () => {
        setIsEditing(false);
        setEditValue('');
    };

    return (
        <Card
            key={item.name}
            className={`mb-2 transition-all duration-200 py-0.5 px-3 ${
                item.isSelected
                    ? 'bg-primary/10 border-primary/20 shadow-md'
                    : 'bg-background hover:bg-accent/50'
            }`}
        >
            <CardContent className="flex items-center justify-between p-0.5">
                <div className="flex items-center gap-4 flex-1">
                    {isUpdateLoading
                        ? (
                                <Loader2 className="h-6 w-6 animate-spin shrink-0" />
                            )
                        : (
                                <Checkbox
                                    id={`checkbox-${item.name}`}
                                    checked={item.isSelected}
                                    onCheckedChange={handleUpdateItem}
                                    className="shrink-0 h-5 w-5"
                                    disabled={isEditing}
                                />
                            )}

                    {isEditing
                        ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <Input
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleEditSave();
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
                                        onClick={handleEditSave}
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
                                <Label
                                    htmlFor={`checkbox-${item.name}`}
                                    className={`flex-1 cursor-pointer text-base ${
                                        item.isSelected
                                            ? 'line-through text-muted-foreground'
                                            : 'text-foreground'
                                    }`}
                                >
                                    {item.name}
                                </Label>
                            )}
                </div>

                <div className="flex items-center">
                    {!isEditing && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleEditStart}
                            className="h-12 w-12 hover:bg-blue-50 hover:text-blue-600"
                        >
                            <Edit2 size={20} strokeWidth={1.75} />
                        </Button>
                    )}
                    {isDeleteLoading
                        ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            )
                        : (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleDeleteItem}
                                    className="h-12 w-12 hover:bg-destructive/10 hover:text-destructive"
                                    disabled={isEditing}
                                >
                                    <X size={24} strokeWidth={1.75} />
                                </Button>
                            )}
                </div>
            </CardContent>
        </Card>
    );
};

export default ItemCheckBox;
