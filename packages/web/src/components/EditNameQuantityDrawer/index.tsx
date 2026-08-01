import type { RefObject } from 'react';
import { QuantityUnitField } from '../../components/QuantityUnitField';
import { Button } from '../../components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '../../components/ui/drawer';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

interface EditNameQuantityDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    nameLabel: string;
    namePlaceholder: string;
    nameId: string;
    nameInputRef: RefObject<HTMLInputElement>;
    name: string;
    onNameChange: (value: string) => void;
    showQuantityUnit: boolean;
    quantity: string;
    unit: string;
    onQuantityChange: (value: string) => void;
    onUnitChange: (value: string) => void;
    quantityId: string;
    unitId: string;
    onSave: () => void;
    saveDisabled: boolean;
}

export const EditNameQuantityDrawer = ({
    open,
    onOpenChange,
    title,
    nameLabel,
    namePlaceholder,
    nameId,
    nameInputRef,
    name,
    onNameChange,
    showQuantityUnit,
    quantity,
    unit,
    onQuantityChange,
    onUnitChange,
    quantityId,
    unitId,
    onSave,
    saveDisabled,
}: EditNameQuantityDrawerProps) => (
    <Drawer open={open} onOpenChange={(next) => !next && onOpenChange(false)}>
        <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
                <DrawerHeader>
                    <DrawerTitle>{title}</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 space-y-4">
                    <div>
                        <Label htmlFor={nameId}>{nameLabel}</Label>
                        <Input
                            id={nameId}
                            ref={nameInputRef}
                            value={name}
                            onChange={(e) => onNameChange(e.target.value)}
                            placeholder={namePlaceholder}
                            className="mt-2"
                        />
                    </div>

                    {showQuantityUnit && (
                        <QuantityUnitField
                            quantity={quantity}
                            unit={unit}
                            onQuantityChange={onQuantityChange}
                            onUnitChange={onUnitChange}
                            quantityId={quantityId}
                            unitId={unitId}
                        />
                    )}
                </div>
                <DrawerFooter>
                    <Button onClick={onSave} disabled={saveDisabled}>
                        Save Changes
                    </Button>
                    <DrawerClose asChild>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                    </DrawerClose>
                </DrawerFooter>
            </div>
        </DrawerContent>
    </Drawer>
);
