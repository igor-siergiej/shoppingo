import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

export interface QuantityUnitFieldProps {
    quantity: string;
    unit: string;
    onQuantityChange: (value: string) => void;
    onUnitChange: (value: string) => void;
    quantityId?: string;
    unitId?: string;
}

export const QuantityUnitField = ({
    quantity,
    unit,
    onQuantityChange,
    onUnitChange,
    quantityId = 'quantity',
    unitId = 'unit',
}: QuantityUnitFieldProps) => {
    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <Label htmlFor={quantityId}>Quantity</Label>
                <Input
                    id={quantityId}
                    type="number"
                    value={quantity}
                    onChange={(e) => onQuantityChange(e.target.value)}
                    placeholder="e.g., 2"
                    className="mt-2 border border-foreground/30"
                    step="0.01"
                />
            </div>
            <div>
                <Label htmlFor={unitId}>Unit</Label>
                <Select value={unit} onValueChange={onUnitChange}>
                    <SelectTrigger id={unitId} className="mt-2 border border-foreground/30">
                        <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pcs">pcs</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};
