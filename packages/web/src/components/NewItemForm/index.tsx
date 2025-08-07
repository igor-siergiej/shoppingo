import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X, Plus } from 'lucide-react';
import { NewItemFormProps } from './types';

const NewItemForm = ({ handleAdd }: NewItemFormProps) => {
    const [open, setOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [error, setError] = useState(false);

    const validateForm = () => {
        return newName.length === 0;
    };

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus();
        }
    }, [open]);

    return open
        ? (
                <>
                    <div className="space-y-2 mb-4">
                        <Label htmlFor="new-item">Add New Item</Label>
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
                            placeholder="Enter item name..."
                        />
                        {error && (
                            <p className="text-sm text-destructive">Name cannot be blank.</p>
                        )}
                    </div>
                    <div className="flex gap-2 pb-10">
                        <Button
                            onClick={async () => {
                                if (validateForm()) {
                                    setError(true);
                                    return;
                                }
                                await handleAdd(newName.trim());
                                setOpen(false);
                                setNewName('');
                            }}
                            className="flex-1"
                        >
                            <Check className="h-4 w-4" />
                            Accept
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setOpen(false);
                                setNewName('');
                                setError(false);
                            }}
                            className="flex-1"
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </Button>
                    </div>
                </>
            )
        : (
                <Button
                    onClick={() => {
                        setOpen(true);
                    }}
                    className="w-full"
                >
                    <Plus className="h-4 w-4" />
                    Add Item
                </Button>
            );
};

export default NewItemForm;
