import type { Item, ListType } from '@shoppingo/types';
import { ListType as ListTypeEnum } from '@shoppingo/types';
import { type MouseEvent, useState } from 'react';
import { useItemMutations } from '@/hooks/useItemMutations';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

export const useItemEditState = (item: Item, listTitle: string) => {
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [drawerEditValue, setDrawerEditValue] = useState('');
    const [drawerQuantityValue, setDrawerQuantityValue] = useState('');
    const [drawerUnitValue, setDrawerUnitValue] = useState('');
    const [drawerDueDateValue, setDrawerDueDateValue] = useState<Date | undefined>(undefined);
    const [isDeleting, setIsDeleting] = useState(false);

    const { controls } = useSwipeGesture();
    const { toggleMutation, deleteMutation, updateNameMutation, updateQuantityMutation, updateDueDateMutation } =
        useItemMutations(listTitle, item.name);

    const handleDeleteItem = async (e?: MouseEvent) => {
        e?.stopPropagation();
        setIsDeleting(true);
        deleteMutation.mutate();
    };

    const handleEditStart = (e?: MouseEvent, closeSwipe?: () => void) => {
        e?.stopPropagation();
        closeSwipe?.();
        void controls.start({ x: 0 });
        setDrawerEditValue(item.name);
        setDrawerQuantityValue(item.quantity?.toString() ?? '');
        setDrawerUnitValue(item.unit ?? '');
        if (item.dueDate instanceof Date) {
            setDrawerDueDateValue(item.dueDate);
        } else if (typeof item.dueDate === 'string') {
            setDrawerDueDateValue(new Date(item.dueDate));
        } else {
            setDrawerDueDateValue(undefined);
        }
        setIsEditDrawerOpen(true);
    };

    const handleDrawerEditSave = (listType: ListType) => {
        const hasNameChange = drawerEditValue.trim() && drawerEditValue !== item.name;
        const newQuantity = drawerQuantityValue.trim() ? parseFloat(drawerQuantityValue) : undefined;
        const newUnit = drawerUnitValue.trim() || undefined;
        const hasQuantityChange = newQuantity !== item.quantity || newUnit !== item.unit;

        const hasDueDateChange =
            drawerDueDateValue?.toDateString() !==
            (item.dueDate instanceof Date ? item.dueDate.toDateString() : undefined);

        if (hasNameChange) {
            updateNameMutation.mutate(drawerEditValue.trim());
        }

        if (hasQuantityChange) {
            updateQuantityMutation.mutate({ quantity: newQuantity, unit: newUnit });
        }

        if (hasDueDateChange && listType === ListTypeEnum.TODO) {
            updateDueDateMutation.mutate(drawerDueDateValue);
        }

        setIsEditDrawerOpen(false);
        setDrawerEditValue('');
        setDrawerQuantityValue('');
        setDrawerUnitValue('');
        setDrawerDueDateValue(undefined);
    };

    const handleDrawerEditCancel = () => {
        setIsEditDrawerOpen(false);
        setDrawerEditValue('');
        setDrawerQuantityValue('');
        setDrawerUnitValue('');
        setDrawerDueDateValue(undefined);
    };

    const handleToggleSelected = () => {
        if (toggleMutation.isLoading) return;
        const next = !item.isSelected;
        toggleMutation.mutate(next);
    };

    return {
        isEditDrawerOpen,
        setIsEditDrawerOpen,
        drawerEditValue,
        setDrawerEditValue,
        drawerQuantityValue,
        setDrawerQuantityValue,
        drawerUnitValue,
        setDrawerUnitValue,
        drawerDueDateValue,
        setDrawerDueDateValue,
        isDeleting,
        deleteMutation,
        toggleMutation,
        handleDeleteItem,
        handleEditStart,
        handleDrawerEditSave,
        handleDrawerEditCancel,
        handleToggleSelected,
    };
};
