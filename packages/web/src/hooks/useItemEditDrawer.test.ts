import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useItemEditDrawer } from './useItemEditDrawer';

describe('useItemEditDrawer', () => {
    it('initializes with closed drawer and empty values', () => {
        const { result } = renderHook(() => useItemEditDrawer());

        expect(result.current.isOpen).toBe(false);
        expect(result.current.values.name).toBe('');
        expect(result.current.values.quantity).toBe('');
        expect(result.current.values.unit).toBe('');
        expect(result.current.values.dueDate).toBeUndefined();
    });

    it('opens drawer and sets initial values from item', () => {
        const { result } = renderHook(() => useItemEditDrawer());
        const testDate = new Date('2026-04-01');

        act(() => {
            result.current.openDrawer({
                name: 'Test Item',
                quantity: 5,
                unit: 'kg',
                dueDate: testDate,
            });
        });

        expect(result.current.isOpen).toBe(true);
        expect(result.current.values.name).toBe('Test Item');
        expect(result.current.values.quantity).toBe('5');
        expect(result.current.values.unit).toBe('kg');
        expect(result.current.values.dueDate).toBe(testDate);
    });

    it('updates individual values', () => {
        const { result } = renderHook(() => useItemEditDrawer());

        act(() => {
            result.current.updateName('New Name');
        });
        expect(result.current.values.name).toBe('New Name');

        act(() => {
            result.current.updateQuantity('10');
        });
        expect(result.current.values.quantity).toBe('10');

        act(() => {
            result.current.updateUnit('l');
        });
        expect(result.current.values.unit).toBe('l');

        const testDate = new Date('2026-05-01');
        act(() => {
            result.current.updateDueDate(testDate);
        });
        expect(result.current.values.dueDate).toBe(testDate);
    });

    it('closes drawer and resets values', () => {
        const { result } = renderHook(() => useItemEditDrawer());

        act(() => {
            result.current.openDrawer({
                name: 'Test Item',
                quantity: 5,
                unit: 'kg',
                dueDate: undefined,
            });
        });

        expect(result.current.isOpen).toBe(true);

        act(() => {
            result.current.closeDrawer();
        });

        expect(result.current.isOpen).toBe(false);
        expect(result.current.values.name).toBe('');
        expect(result.current.values.quantity).toBe('');
        expect(result.current.values.unit).toBe('');
        expect(result.current.values.dueDate).toBeUndefined();
    });

    it('detects name changes', () => {
        const { result } = renderHook(() => useItemEditDrawer());
        const originalName = 'Original';

        act(() => {
            result.current.openDrawer({
                name: originalName,
                quantity: undefined,
                unit: undefined,
                dueDate: undefined,
            });
            result.current.updateName('Updated');
        });

        expect(result.current.hasChanges()).toBe(true);

        act(() => {
            result.current.updateName(originalName);
        });

        expect(result.current.hasChanges()).toBe(false);
    });

    it('detects quantity/unit changes', () => {
        const { result } = renderHook(() => useItemEditDrawer());

        act(() => {
            result.current.openDrawer({
                name: 'Item',
                quantity: 5,
                unit: 'kg',
                dueDate: undefined,
            });
            result.current.updateQuantity('10');
        });

        expect(result.current.hasChanges()).toBe(true);
    });

    it('detects date changes', () => {
        const { result } = renderHook(() => useItemEditDrawer());
        const date1 = new Date('2026-04-01');
        const date2 = new Date('2026-05-01');

        act(() => {
            result.current.openDrawer({
                name: 'Item',
                quantity: undefined,
                unit: undefined,
                dueDate: date1,
            });
            result.current.updateDueDate(date2);
        });

        expect(result.current.hasChanges()).toBe(true);
    });
});
