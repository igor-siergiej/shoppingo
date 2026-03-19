import { useState } from 'react';

interface EditValues {
    name: string;
    quantity: string;
    unit: string;
    dueDate: Date | undefined;
}

interface EditItemData {
    name: string;
    quantity: number | undefined;
    unit: string | undefined;
    dueDate: Date | undefined;
}

export const useItemEditDrawer = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [values, setValues] = useState<EditValues>({
        name: '',
        quantity: '',
        unit: '',
        dueDate: undefined,
    });
    const [originalValues, setOriginalValues] = useState<EditValues>({
        name: '',
        quantity: '',
        unit: '',
        dueDate: undefined,
    });

    const openDrawer = (item: EditItemData) => {
        const newValues: EditValues = {
            name: item.name,
            quantity: item.quantity?.toString() ?? '',
            unit: item.unit ?? '',
            dueDate: item.dueDate,
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
            dueDate: undefined,
        });
        setOriginalValues({
            name: '',
            quantity: '',
            unit: '',
            dueDate: undefined,
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

    const updateDueDate = (dueDate: Date | undefined) => {
        setValues((prev) => ({ ...prev, dueDate }));
    };

    const hasChanges = () => {
        return (
            values.name !== originalValues.name ||
            values.quantity !== originalValues.quantity ||
            values.unit !== originalValues.unit ||
            values.dueDate?.toDateString() !== originalValues.dueDate?.toDateString()
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
        updateDueDate,
        hasChanges,
    };
};
