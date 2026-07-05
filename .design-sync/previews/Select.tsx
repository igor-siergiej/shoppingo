import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@shoppingo/web';

export const Open = () => (
    <div style={{ padding: 24, minHeight: 300, width: 260 }}>
        <Select defaultValue="dairy" open>
            <SelectTrigger>
                <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectLabel>Category</SelectLabel>
                    <SelectItem value="dairy">Dairy</SelectItem>
                    <SelectItem value="produce">Produce</SelectItem>
                    <SelectItem value="bakery">Bakery</SelectItem>
                    <SelectItem value="household">Household</SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>
    </div>
);
