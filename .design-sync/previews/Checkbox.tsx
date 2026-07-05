import { Checkbox, Label } from '@shoppingo/web';

export const States = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Checkbox id="a" defaultChecked />
            <Label htmlFor="a">Milk</Label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Checkbox id="b" />
            <Label htmlFor="b">Eggs</Label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Checkbox id="c" disabled />
            <Label htmlFor="c">Bread (unavailable)</Label>
        </div>
    </div>
);
