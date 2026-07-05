import { Input, Label } from '@shoppingo/web';

export const WithInput = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 280 }}>
        <Label htmlFor="item">Item name</Label>
        <Input id="item" placeholder="e.g. Tomatoes" />
    </div>
);
