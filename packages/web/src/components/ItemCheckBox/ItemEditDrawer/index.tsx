import type { ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { useEffect, useId, useRef } from 'react';
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
} from '../../../components/ui/drawer';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

interface ItemEditDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    listType: ListType;
    drawerEditValue: string;
    onEditValueChange: (value: string) => void;
    drawerQuantityValue: string;
    onQuantityChange: (value: string) => void;
    drawerUnitValue: string;
    onUnitChange: (value: string) => void;
    drawerDueDateValue: Date | undefined;
    onDueDateChange: (value: Date | undefined) => void;
    onSave: () => void;
    onCancel: () => void;
}

export const ItemEditDrawer = ({
    open,
    onOpenChange,
    listType,
    drawerEditValue,
    onEditValueChange,
    drawerQuantityValue,
    onQuantityChange,
    drawerUnitValue,
    onUnitChange,
    drawerDueDateValue,
    onDueDateChange,
    onSave,
    onCancel,
}: ItemEditDrawerProps) => {
    const editItemNameId = useId();
    const drawerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setTimeout(() => {
                drawerInputRef.current?.focus();
            }, 250);
        }
    }, [open]);

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <div className="mx-auto w-full max-w-sm">
                    <DrawerHeader>
                        <DrawerTitle>Edit Item</DrawerTitle>
                    </DrawerHeader>
                    <div>
                        <Label htmlFor={editItemNameId}>Item Name</Label>
                        <Input
                            id={editItemNameId}
                            ref={drawerInputRef}
                            value={drawerEditValue}
                            onChange={(e) => onEditValueChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onSave();
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    onCancel();
                                }
                            }}
                            placeholder="Enter item name"
                            className="mt-2"
                        />
                    </div>

                    {listType === ListTypeEnum.SHOPPING && (
                        <QuantityUnitField
                            quantity={drawerQuantityValue}
                            unit={drawerUnitValue}
                            onQuantityChange={onQuantityChange}
                            onUnitChange={onUnitChange}
                            quantityId="edit-item-quantity"
                            unitId="edit-item-unit"
                        />
                    )}

                    {listType === ListTypeEnum.TODO && (
                        <DueDateField value={drawerDueDateValue} onChange={onDueDateChange} />
                    )}

                    <DrawerFooter>
                        <Button onClick={onSave} disabled={!drawerEditValue.trim()}>
                            Save Changes
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline" onClick={onCancel}>
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    );
};
