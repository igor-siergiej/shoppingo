import { Item } from '@shoppingo/types';
import { Loader2, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import { deleteItem, updateItem } from '../../api';

export interface ItemCheckBoxProps {
    item: Item;
    listName: string;
    refetch: () => void;
}

const ItemCheckBox = ({ item, listName, refetch }: ItemCheckBoxProps) => {
    const [isUpdateLoading, setIsUpdateLoading] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

    const handleUpdateItem = async () => {
        setIsUpdateLoading(true);
        await updateItem(item.name, !item.isSelected, listName);
        await refetch();
        setIsUpdateLoading(false);
    };

    const handleDeleteItem = async () => {
        setIsDeleteLoading(true);
        await deleteItem(item.name, listName);
        await refetch();
        setIsDeleteLoading(false);
    };

    return (
        <div
            key={item.name}
            className="flex items-center w-full pb-2"
        >
            <div className="flex items-center gap-3 flex-1">
                {isUpdateLoading
                    ? (
                            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        )
                    : (
                            <Checkbox
                                id={`checkbox-${item.name}`}
                                checked={item.isSelected}
                                onCheckedChange={handleUpdateItem}
                                className="shrink-0"
                            />
                        )}
                <Label
                    htmlFor={`checkbox-${item.name}`}
                    className={`flex-1 text-center cursor-pointer ${item.isSelected ? 'line-through text-muted-foreground' : ''}`}
                >
                    {item.name}
                </Label>
            </div>

            <div className="flex items-center pl-2">
                {isDeleteLoading
                    ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )
                    : (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDeleteItem}
                                className="h-8 w-8"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
            </div>
        </div>
    );
};

export default ItemCheckBox;
