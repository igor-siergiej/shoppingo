import { Label, Switch } from '@shoppingo/web';

export const States = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Switch id="s1" defaultChecked />
            <Label htmlFor="s1">Sync over Wi-Fi only</Label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Switch id="s2" />
            <Label htmlFor="s2">Show checked items</Label>
        </div>
    </div>
);
