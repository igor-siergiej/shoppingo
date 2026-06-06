import { useState } from 'react';

interface EditValues {
    name: string;
    quantity: string;
    unit: string;
}

interface EditItemData {
    name: string;
    quantity: number | undefined;
    unit: string | undefined;
}

export const useItemEditDrawer = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [values, setValues] = useState<EditValues>({
        name: '',
        quantity: '',
        unit: '',
    });
    const [originalValues, setOriginalValues] = useState<EditValues>({
        name: '',
        quantity: '',
        unit: '',
    });

    const openDrawer = (item: EditItemData) => {
        const newValues: EditValues = {
            name: item.name,
            quantity: item.quantity?.toString() ?? '',
            unit: item.unit ?? '',
        };
        setValues(newValues);
        setOriginalValues(newValues);
        setIsOpen(true);
    };

    const closeDrawer = () => {
        setIsOpen(false);
        setValues({
            name: '',
            quantity: '',
            unit: '',
        });
        setOriginalValues({
            name: '',
            quantity: '',
            unit: '',
        });
    };

    const updateName = (name: string) => {
        setValues((prev) => ({ ...prev, name }));
    };

    const updateQuantity = (quantity: string) => {
        setValues((prev) => ({ ...prev, quantity }));
    };

    const updateUnit = (unit: string) => {
        setValues((prev) => ({ ...prev, unit }));
    };

    const hasChanges = () => {
        return (
            values.name !== originalValues.name ||
            values.quantity !== originalValues.quantity ||
            values.unit !== originalValues.unit
        );
    };

    return {
        isOpen,
        values,
        openDrawer,
        closeDrawer,
        updateName,
        updateQuantity,
        updateUnit,
        hasChanges,
    };
};
