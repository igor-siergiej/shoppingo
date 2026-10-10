import { ITEM_CATEGORIES } from '@shoppingo/types';

import { CATEGORY_LABELS } from '../../utils/itemCategories';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface AisleSelectProps {
    /** An ItemCategory, or '' while the item is still unclassified. */
    value: string;
    onChange: (category: string) => void;
}

export const AisleSelect = ({ value, onChange }: AisleSelectProps) => (
    <div>
        <Label>Aisle</Label>
        <Select value={value || undefined} onValueChange={onChange}>
            <SelectTrigger className="mt-2 h-12 text-base" aria-label="Aisle">
                <SelectValue placeholder="Not sorted yet" />
            </SelectTrigger>
            <SelectContent>
                {ITEM_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                        {CATEGORY_LABELS[category]}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
);
