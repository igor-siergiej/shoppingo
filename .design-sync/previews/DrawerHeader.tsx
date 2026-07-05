import { DrawerHeader } from '@shoppingo/web';

export const Default = () => (
    <div style={{ width: 360, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--background)' }}>
        <div style={{ margin: '12px auto 0', height: 6, width: 100, borderRadius: 999, background: 'var(--muted)' }} />
        <DrawerHeader>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Manage labels</div>
            <div style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
                Organise items with colour-coded labels.
            </div>
        </DrawerHeader>
    </div>
);
