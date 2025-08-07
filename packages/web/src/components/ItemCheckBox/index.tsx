import { updateItem, deleteItem } from '../../api';
import { useState } from 'react';
import { Item } from '@shoppingo/types';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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
            <div className="flex items-center space-x-2 flex-1">
                {isUpdateLoading
                    ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )
                    : (
                            <Checkbox
                                id={`checkbox-${item.name}`}
                                checked={item.isSelected}
                                onCheckedChange={handleUpdateItem}
                            />
                        )}
                <Label
                    htmlFor={`checkbox-${item.name}`}
                    className={`w-full cursor-pointer ${item.isSelected ? 'line-through text-muted-foreground' : ''}`}
                >
                    {item.name}
                </Label>
            </div>

            {isDeleteLoading
                ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    )
                : (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDeleteItem}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}

            <div className="border-t border-border w-full mt-2" />
        </div>
    );
};

export default ItemCheckBox;
