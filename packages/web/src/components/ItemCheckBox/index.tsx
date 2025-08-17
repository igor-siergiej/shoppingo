import { Item } from '@shoppingo/types';
import { Loader2, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import { deleteItem, updateItem } from '../../api';

export interface ItemCheckBoxProps {
    item: Item;
    listTitle: string;
    refetch: () => void;
}

const ItemCheckBox = ({ item, listTitle, refetch }: ItemCheckBoxProps) => {
    const [isUpdateLoading, setIsUpdateLoading] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);

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
                                />
                            )}
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
                </div>

                <div className="flex items-center">
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
