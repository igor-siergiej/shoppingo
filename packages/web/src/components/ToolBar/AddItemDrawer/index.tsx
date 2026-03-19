import type { ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { DueDateField } from '../../../components/DueDateField';
import { QuantityUnitField } from '../../../components/QuantityUnitField';
import { Button } from '../../../components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '../../../components/ui/drawer';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { RippleButton } from '../../../components/ui/ripple';

export interface AddItemDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (name: string, quantity?: number, unit?: string, dueDate?: Date) => Promise<void>;
    listType?: ListType;
    placeholder?: string;
}

export const AddItemDrawer = ({ open, onOpenChange, onAdd, listType, placeholder }: AddItemDrawerProps) => {
    const itemNameId = useId();
    const [newName, setNewName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('');
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        const trimmedName = newName.trim();

        if (!trimmedName) {
            setError('Item name is required');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const quantityNum = quantity.trim() ? parseFloat(quantity) : undefined;
            const unitValue = unit.trim() || undefined;
            await onAdd(trimmedName, quantityNum, unitValue, dueDate);

            setNewName('');
            setQuantity('');
            setUnit('');
            setDueDate(undefined);
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add item');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setNewName('');
        setQuantity('');
        setUnit('');
        setDueDate(undefined);
        setError('');
        onOpenChange(false);
    };

    const title = listType === ListTypeEnum.TODO ? 'Add New Task' : 'Add New Item';

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerTrigger asChild>
                <RippleButton
                    size="icon"
                    className="h-12 w-12 rounded-full border-2 border-primary/20 hover:border-primary/40 transition-colors"
                >
                    <Plus className="size-5" />
                </RippleButton>
            </DrawerTrigger>
            <DrawerContent>
                <div className="w-full sm:mx-auto sm:max-w-[400px]">
                    <DrawerHeader>
                        <DrawerTitle>{title}</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 pb-0 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-item">
                                {listType === ListTypeEnum.TODO ? 'Task Name' : 'Item Name'}
                            </Label>
                            <Input
                                id={itemNameId}
                                value={newName}
                                autoComplete="off"
                                autoFocus
                                className={`${error ? 'border-destructive' : ''} h-12 text-base`}
                                onChange={(event) => {
                                    setError('');
                                    setNewName(event.target.value);
                                }}
                                placeholder={placeholder}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        void handleSubmit();
                                    } else if (e.key === 'Escape') {
                                        handleCancel();
                                    }
                                }}
                            />
                            {error && <p className="text-sm text-destructive">{error}</p>}
                        </div>

                        {/* Quantity and Unit fields for shopping lists */}
                        {listType === ListTypeEnum.SHOPPING && (
                            <QuantityUnitField
                                quantity={quantity}
                                unit={unit}
                                onQuantityChange={setQuantity}
                                onUnitChange={setUnit}
                                quantityId="new-item-quantity"
                                unitId="new-item-unit"
                            />
                        )}

                        {/* Due date picker for TODO lists */}
                        {listType === ListTypeEnum.TODO && (
                            <DueDateField value={dueDate} onChange={setDueDate} captionLayout="dropdown" />
                        )}

                        {/* Fallback quantity/unit when no list type is known */}
                        {!listType && (
                            <QuantityUnitField
                                quantity={quantity}
                                unit={unit}
                                onQuantityChange={setQuantity}
                                onUnitChange={setUnit}
                                quantityId="new-item-quantity"
                                unitId="new-item-unit"
                            />
                        )}
                    </div>
                    <DrawerFooter>
                        <Button onClick={handleSubmit} disabled={isLoading}>
                            Add Item
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
};
