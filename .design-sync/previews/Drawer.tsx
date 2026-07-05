import {
    Button,
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@shoppingo/web';

export const Open = () => (
    <Drawer open modal={false}>
        <DrawerContent>
            <DrawerHeader>
                <DrawerTitle>Manage labels</DrawerTitle>
                <DrawerDescription>Organise items with colour-coded labels.</DrawerDescription>
            </DrawerHeader>
            <div style={{ padding: '0 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--primary)', color: 'var(--primary-foreground)', fontSize: 13 }}>
                    Fresh
                </span>
                <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--secondary)', color: 'var(--secondary-foreground)', fontSize: 13 }}>
                    Frozen
                </span>
                <span style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--muted)', color: 'var(--muted-foreground)', fontSize: 13 }}>
                    Pantry
                </span>
            </div>
            <DrawerFooter>
                <Button>Add label</Button>
                <Button variant="outline">Done</Button>
            </DrawerFooter>
        </DrawerContent>
    </Drawer>
);
