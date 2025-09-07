import { Check, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { AddItemDrawerProps } from './types';

const AddItemDrawer = ({ handleAdd, placeholder = 'Enter item name...' }: AddItemDrawerProps) => {
    const [newName, setNewName] = useState('');
    const [error, setError] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const validateForm = () => {
        return newName.length === 0;
    };

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            // Longer timeout for mobile devices to ensure drawer animation completes
            const timeoutId = setTimeout(() => {
                inputRef.current?.focus();
                // Scroll the input into view on mobile
                if (inputRef.current) {
                    inputRef.current.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });
                }
            }, 200);

            return () => clearTimeout(timeoutId);
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (validateForm()) {
            setError(true);

            return;
        }

        await handleAdd(newName.trim());
        setNewName('');
        setError(false);
        setIsOpen(false);
    };

    const handleCancel = () => {
        setNewName('');
        setError(false);
        setIsOpen(false);
    };

    return (
        <div className="fixed bottom-20 left-4 z-40">
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
                <DrawerTrigger asChild>
                    <Button
                        className="h-14 w-14 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                    >
                        <Plus className="h-6 w-6" />
                    </Button>
                </DrawerTrigger>
                <DrawerContent>
                    <div className="mx-auto w-full max-w-sm">
                        <DrawerHeader>
                            <DrawerTitle>Add New Item</DrawerTitle>
                        </DrawerHeader>
                        <div className="p-4 pb-0">
                            <div className="space-y-2">
                                <Label htmlFor="new-item">Item Name</Label>
                                <Input
                                    id="new-item"
                                    ref={inputRef}
                                    value={newName}
                                    autoComplete="off"
                                    className={error ? 'border-destructive' : ''}
                                    onChange={(event) => {
                                        setError(false);
                                        setNewName(event.target.value);
                                    }}
                                    placeholder={placeholder}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSubmit();
                                        } else if (e.key === 'Escape') {
                                            handleCancel();
                                        }
                                    }}
                                />
                                {error && (
                                    <p className="text-sm text-destructive">Name cannot be blank.</p>
                                )}
                            </div>
                        </div>
                        <DrawerFooter>
                            <Button onClick={handleSubmit}>
                                <Check className="h-4 w-4 mr-2" />
                                Add Item
                            </Button>
                            <DrawerClose asChild>
                                <Button variant="outline" onClick={handleCancel}>
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
};

export default AddItemDrawer;
