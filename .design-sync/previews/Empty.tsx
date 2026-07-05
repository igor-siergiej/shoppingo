import { Button, Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@shoppingo/web';

const CartIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
);

export const NoItems = () => (
    <Empty style={{ width: 360, border: '1px dashed var(--border)' }}>
        <EmptyHeader>
            <EmptyMedia variant="icon">
                <CartIcon />
            </EmptyMedia>
            <EmptyTitle>Your list is empty</EmptyTitle>
            <EmptyDescription>Add your first item to start shopping.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
            <Button size="sm">Add item</Button>
        </EmptyContent>
    </Empty>
);
