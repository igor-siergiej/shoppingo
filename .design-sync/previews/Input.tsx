import { Input } from '@shoppingo/web';

export const Default = () => (
    <div style={{ width: 280 }}>
        <Input placeholder="Add an item…" />
    </div>
);

export const States = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 280 }}>
        <Input defaultValue="Semi-skimmed milk" />
        <Input placeholder="Search recipes" />
        <Input placeholder="Disabled" disabled />
    </div>
);
