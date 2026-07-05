import { Button, DrawerFooter } from '@shoppingo/web';

export const Default = () => (
    <div style={{ width: 360, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--background)' }}>
        <DrawerFooter>
            <Button>Save changes</Button>
            <Button variant="outline">Cancel</Button>
        </DrawerFooter>
    </div>
);
